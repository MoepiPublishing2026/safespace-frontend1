import MenuToggle from "@/components/menuToggle";
import TopBar from "@/components/toBar";
import { BACKEND_URL } from "@/utils/config";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { Audio, ResizeMode, Video } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";

const { width } = Dimensions.get("window");

// Allow common address characters
const ADDRESS_REGEX = /^[a-zA-Z0-9\s@#.,\-\/()]+$/;

// Age–Grade ranges
const GRADE_AGE_RANGES: Record<string, { min: number; max: number }> = {
  Creche: { min: 0, max: 5 },
  "Grade R": { min: 5, max: 7 },
  "Grade 1": { min: 6, max: 8 },
  "Grade 2": { min: 7, max: 9 },
  "Grade 3": { min: 8, max: 10 },
  "Grade 4": { min: 9, max: 12 },
  "Grade 5": { min: 11, max: 13 },
  "Grade 6": { min: 12, max: 14 },
  "Grade 7": { min: 13, max: 15 },
  "Grade 8": { min: 14, max: 16 },
  "Grade 9": { min: 15, max: 17 },
  "Grade 10": { min: 16, max: 18 },
  "Grade 11": { min: 17, max: 19 },
  "Grade 12": { min: 18, max: 22 },
  College: { min: 16, max: 99 },
};

const validateAgeGrade = (age: number, grade: string) => {
  const normalizedGrade = grade?.trim();
  const range = GRADE_AGE_RANGES[normalizedGrade];
  if (!range) return { status: "error", message: "Invalid grade entered" };
  if (age < range.min || age > range.max)
    return { status: "warning", message: `Age ${age} is unusual for ${normalizedGrade}` };
  return { status: "ok" };
};

export default function EditReportScreen() {
  const { case_number } = useLocalSearchParams();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [abuseTypeItems, setAbuseTypeItems] = useState<any[]>([]);
  const [abuseTypeOpen, setAbuseTypeOpen] = useState(false);
  const [selectedAbuseType, setSelectedAbuseType] = useState("");
  const [selectedSubtype, setSelectedSubtype] = useState("");
  const [subtypeItems, setSubtypeItems] = useState<any[]>([]);
  const [subtypeOpen, setSubtypeOpen] = useState(false);
  const [otherSubtype, setOtherSubtype] = useState("");
  const [media, setMedia] = useState<any[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(width))[0];
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);



  const updateReportField = (field: string, value: any) => {
    setReport((prev: any) => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: undefined }));
  };

  // Fetch report
  useEffect(() => {
    if (!case_number) return;
    axios
      .get(`${BACKEND_URL}/reports/case/${case_number}`)
      .then((res) => {
        setReport(res.data);
        setSelectedAbuseType(String(res.data.abuse_type_id));
        setSelectedSubtype(String(res.data.subtype_id));

        // ✅ Set otherSubtype if it exists
        if (res.data.other_subtype) {
          setOtherSubtype(res.data.other_subtype);
        } else {
          setOtherSubtype(""); // reset if not present
        }

        if (res.data.image_path) {
          try {
            const files = JSON.parse(res.data.image_path);
            if (Array.isArray(files) && files.length > 0) {
              const formattedMedia = files.map((file: string) => {
                const fullPath = `${BACKEND_URL}${file}`;
                const extension = file.split(".").pop()?.toLowerCase();
                let type = "image";
                if (["mp4", "mov"].includes(extension || "")) type = "video";
                else if (["mp3", "wav", "m4a"].includes(extension || "")) type = "audio";

                return { uri: fullPath, type };
              });
              setMedia(formattedMedia);
            }
          } catch (e) {
            console.log("Error parsing media:", e);
          }
        }
      })
      .catch(() => console.error("Failed to fetch report."));
  }, [case_number]);


  useEffect(() => {
    axios.get(`${BACKEND_URL}/reports/abuse-types`)
      .then(res => {
        const formatted = res.data.map((item: any) => ({
          label: item.type_name,
          value: String(item.id),
        }));
        setAbuseTypeItems(formatted);
      })
      .catch(err => console.log("Failed to load report types", err));
  }, []);

  useEffect(() => {
    if (!selectedAbuseType) return;

    axios
      .get(`${BACKEND_URL}/reports/subtypes/${selectedAbuseType}`)
      .then((res) => {
        const formatted = res.data.map((item: any) => ({
          label: item.sub_type_name,
          value: String(item.id),
        }));

        setSubtypeItems(formatted);

        // ✅ IMPORTANT: re-set subtype AFTER items load
        if (report?.subtype_id) {
          setSelectedSubtype(String(report.subtype_id));
        }
      })
      .catch(() => console.log("Failed to fetch subtypes"));
  }, [selectedAbuseType]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  useEffect(() => {
    if (!isOtherSubtype() && !report?.other_subtype) {
      setOtherSubtype("");
    }
  }, [selectedSubtype]);

  const isOtherSubtype = () => {
    const selected = subtypeItems.find(
      (item) => item.value === selectedSubtype
    );
    return selected?.label?.toLowerCase() === "other";
  };

  // Pick image/video
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.5,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setMedia((prev) => [...prev, { uri: asset.uri, type: asset.type }]);
    }
  };

  // Pick audio
  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
    });
    if (!result.canceled) {
      const file = result.assets[0];
      setMedia((prev) => [...prev, { uri: file.uri, type: "audio" }]);
    }
  };
  const playAudio = async (uri: string) => {
    try {
      // SAME audio tapped
      if (currentAudio === uri && sound) {
        const status = await sound.getStatusAsync();

        if (status.isLoaded && status.isPlaying) {
          await sound.pauseAsync();
          return;
        } else if (status.isLoaded) {
          await sound.playAsync();
          return;
        }
      }

      // DIFFERENT audio → stop old one
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setCurrentAudio(uri); // 🔥 IMPORTANT

      newSound.setOnPlaybackStatusUpdate((status) => {
        if ((status as any).didJustFinish) {
          newSound.unloadAsync();
          setSound(null);
          setCurrentAudio(null); // 🔥 reset
        }
      });

    } catch (error) {
      console.log("Audio play error:", error);
    }
  };

  useEffect(() => {
    if (report && !report.subtype_id) {
      setSelectedSubtype("");
    }
  }, [selectedAbuseType]);

  //
  const handleUpdate = async () => {
    if (!report) return;
    const newErrors: any = {};
    if (!selectedSubtype) newErrors.subtype = "Please select a subtype.";
    if (!report.reporter_email) newErrors.reporter_email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.reporter_email))
      newErrors.reporter_email = "Enter a valid email address.";
    if (!report.phone_number) newErrors.phone_number = "Phone number is required.";
    else if (!/^\d{10}$/.test(report.phone_number)) newErrors.phone_number = "Phone number must be 10 digits.";
    if (!report.grade) newErrors.grade = "Grade is required.";
    else if (!report.age) newErrors.age = "Age is required.";
    else {
      const check = validateAgeGrade(parseInt(String(report.age), 10), report.grade);
      if (check.status === "error") {
        // Invalid grade → show under grade field
        newErrors.grade = check.message;
      } else if (check.status === "warning") {
        // Age unusual → show under age field
        newErrors.age = check.message;
      }
    }
    if (!isAnonymous && !report.full_name?.trim()) {
      newErrors.full_name = "Full name is required.";
    }
    else if (report.full_name && report.full_name.length > 50)
      newErrors.full_name = "Full name must be less than 50 characters.";
    if (!report.school_name) newErrors.school_name = "School name is required.";
    else if (report.school_name.length > 50) newErrors.school_name = "School name must be less than 50 chars.";
    if (!report.status) newErrors.status = "Status is required.";

    if (isOtherSubtype()) {
      if (!report.description || report.description.trim() === "") {
        newErrors.description = "Description is required when subtype is 'Other'.";
      }

      if (!otherSubtype || otherSubtype.trim() === "") {
        newErrors.otherSubtype = "Please specify the subtype.";
      }
    } else if (report.description && report.description.length > 500) {
      newErrors.description = "Description must be under 500 characters.";
    }
    if (report.location) {
      if (report.location.length < 5 || report.location.length > 50)
        newErrors.location = "Address must be between 5 and 50 characters.";
      else if (!ADDRESS_REGEX.test(report.location)) newErrors.location = "Address contains invalid characters.";
    } else newErrors.location = "Address is required.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("abuse_type_id", selectedAbuseType);
      formData.append("description", report.description?.trim() || "");
      formData.append("phone_number", report.phone_number);
      formData.append("full_name", isAnonymous ? "" : report.full_name);
      formData.append("is_anonymous", isAnonymous ? "1" : "0");
      formData.append("age", report.age);
      formData.append("location", report.location);
      formData.append("school_name", report.school_name);
      formData.append("status", report.status);
      formData.append("subtype_id", selectedSubtype.toString());
      formData.append("grade", report.grade);

      if (isOtherSubtype()) {
        formData.append("other_subtype", otherSubtype);
      }

      // Existing vs new files
      const existingFiles = media.filter((m) => m.uri.startsWith(BACKEND_URL)).map((m) => m.uri.replace(BACKEND_URL, ""));
      formData.append("existingFiles", JSON.stringify(existingFiles));

      const newFiles = media.filter((m) => !m.uri.startsWith(BACKEND_URL));
      newFiles.forEach((item, index) => {
        const type = item.type === "image" ? "image/jpeg" : item.type === "video" ? "video/mp4" : "audio/mpeg";
        const ext = item.type === "image" ? "jpg" : item.type === "video" ? "mp4" : "mp3";
        formData.append("files", {
          uri: item.uri,
          name: `report-${Date.now()}-${index}.${ext}`,
          type,
        } as any);
      });

      const response = await axios.put(`${BACKEND_URL}/reports/${case_number}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 403) router.push("/access-denied");
      else setSuccessModalVisible(true);
    } catch (err: any) {
      if (err.response?.status === 403) router.push("/access-denied");
      else console.error("Update error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, { toValue: width, duration: 250, useNativeDriver: true }).start(() =>
        setMenuVisible(false)
      );
    } else {
      setMenuVisible(true);
      Animated.timing(slideAnim, { toValue: width * 0.3, duration: 250, useNativeDriver: true }).start();
    }
  };

  const handleNavigate = (path: string) => {
    toggleMenu();
    setTimeout(() => router.push({ pathname: path as any }), 250);
  };

  if (!report)
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#c7da30" />
      </View>
    );
  const isAnonymous = report.is_anonymous == 1;
  const shouldShowOtherField =
  (report?.other_subtype && report.other_subtype.trim() !== "") ||
  isOtherSubtype();

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <TopBar menuVisible={menuVisible} onBack={() => router.back()} onToggleMenu={toggleMenu} />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Text style={styles.title}>Edit Report</Text>
          <Text style={{ marginTop: 5, fontSize: 16, color: "#555" }}>Case Number: {case_number}</Text>
        </View>

        <View style={styles.formWrapper}>

          {/* `Report Type */}

          {/* Subtype */}
          {/* Report Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Report Type</Text>

            <DropDownPicker
              open={abuseTypeOpen}
              value={selectedAbuseType}
              items={abuseTypeItems}
              setOpen={setAbuseTypeOpen}
              setValue={setSelectedAbuseType}
              setItems={setAbuseTypeItems}
              placeholder="Select abuse type"
              style={styles.pickerWrapper}
              dropDownContainerStyle={styles.pickerDropdown}
              zIndex={3000}
            />
          </View>

          {/* Subtype */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subtype</Text>

            <DropDownPicker
              open={subtypeOpen}
              value={selectedSubtype}
              items={subtypeItems}
              setOpen={setSubtypeOpen}
              setValue={setSelectedSubtype}
              setItems={setSubtypeItems}
              placeholder="Select subtype"
              style={styles.pickerWrapper}
              dropDownContainerStyle={styles.pickerDropdown}
              zIndex={2000}
            />

            {errors.subtype && (
              <Text style={styles.errorText}>{errors.subtype}</Text>
            )}
          </View>

          {/* Show if selected subtype is Other OR otherSubtype exists */}
          {shouldShowOtherField && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Please Specify</Text>
              <TextInput
                style={styles.input}
                value={otherSubtype}
                onChangeText={setOtherSubtype}
                placeholder="Enter subtype"
                editable={isOtherSubtype() || !!otherSubtype}
              />
              {errors.otherSubtype && (
                <Text style={styles.errorText}>{errors.otherSubtype}</Text>
              )}
            </View>
          )}


          {/* Full Name */}
          {!isAnonymous && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={report.full_name}
                onChangeText={(text) => updateReportField("full_name", text)}
              />
              {errors.full_name && <Text style={styles.errorText}>{errors.full_name}</Text>}
            </View>
          )}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={report.reporter_email}
              onChangeText={(text) => updateReportField("reporter_email", text)}
            />
            {errors.reporter_email && <Text style={styles.errorText}>{errors.reporter_email}</Text>}
          </View>

          {/* Phone & Age */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={report.phone_number}
                onChangeText={(text) => updateReportField("phone_number", text)}
                keyboardType="number-pad"
              />
              {errors.phone_number && <Text style={styles.errorText}>{errors.phone_number}</Text>}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={String(report.age || "")}
                onChangeText={(text) => updateReportField("age", text)}
                keyboardType="numeric"
              />
              {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
            </View>
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={report.location}
              onChangeText={(text) => updateReportField("location", text)}
            />
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          </View>

          {/* School & Grade */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>School</Text>
              <TextInput
                style={styles.input}
                value={report.school_name}
                onChangeText={(text) => updateReportField("school_name", text)}
              />
              {errors.school_name && <Text style={styles.errorText}>{errors.school_name}</Text>}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Grade</Text>
              <TextInput
                style={styles.input}
                value={report.grade || ""}
                onChangeText={(text) => updateReportField("grade", text)}
              />
              {errors.grade && <Text style={styles.errorText}>{errors.grade}</Text>}
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              value={report.description}
              onChangeText={(text) => updateReportField("description", text)}
              multiline
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Media */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Attachments</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={styles.addMediaButton} onPress={pickMedia}>
                <Ionicons name="camera" size={20} color="#c7da30" />
                <Text style={styles.addMediaText}>Add Image/Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addMediaButton} onPress={pickAudio}>
                <Ionicons name="musical-notes" size={20} color="#c7da30" />
                <Text style={styles.addMediaText}>Add Audio</Text>
              </TouchableOpacity>
            </View>

            {/* Media Grid */}
            <View style={styles.mediaGrid}>
              {media.map((item, index) => (
                <View key={index} style={styles.mediaItem}>
                  {item.type === "image" ? (
                    <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
                  ) : item.type === "video" ? (
                    <Video
                      source={{ uri: item.uri }}
                      style={styles.video}
                      useNativeControls
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={false}
                      isLooping={false}
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.audioContainer}
                      onPress={() => playAudio(item.uri)}
                    >
                      <Ionicons
                        name={currentAudio === item.uri ? "pause" : "play"}
                        size={40}
                        color="#c7da30"
                      />
                      <Text style={styles.audioText}>
                        {currentAudio === item.uri ? "Pause" : "Play"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => setMedia(media.filter((_, i) => i !== index))}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity style={[styles.submitButton, { alignSelf: "center" }]} onPress={handleUpdate}>
          <Text style={styles.submitText}>{loading ? "Updating..." : "Update Report"}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <Modal visible={loading || successModalVisible} transparent animationType="fade">
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#c7da30" />
              <Text style={styles.loadingText}>Updating report...</Text>
            </View>
          </View>
        )}
        {successModalVisible && !loading && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>REPORT UPDATED SUCCESSFULLY</Text>
              <Image source={require("../assets/images/right.jpeg")} style={{ width: 60, height: 60, marginBottom: 15 }} resizeMode="contain" />
              <Text style={styles.modalCase}>CASE NUMBER: {case_number}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setSuccessModalVisible(false);
                  router.push("/");
                }}
              >
                <Text style={styles.modalButtonText}>Ok</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {menuVisible && <TouchableOpacity style={styles.overlay} onPress={toggleMenu} />}
      <MenuToggle
        menuVisible={menuVisible}
        slideAnim={slideAnim}
        onNavigate={handleNavigate}
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/check-status");
        }}
        onClose={() => setMenuVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

// Include your full styles as before
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { flexGrow: 1, paddingVertical: 20, paddingHorizontal: 15 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20, color: "black", fontFamily: "Montserrat" },
  label: { color: "black", marginBottom: 6, fontFamily: "Montserrat" },
  input: {
    borderWidth: 2,
    borderColor: "#c7da30",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: "#fff",
    width: "100%",
    height: 48,
    fontFamily: "Montserrat",
  },
  video: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  descriptionInput: { height: 100, textAlignVertical: "top", fontFamily: "Montserrat" },
  submitText: { color: "#1aaed3ff", fontWeight: "bold", fontSize: 16 },
  formWrapper: { width: "100%", maxWidth: 800, borderWidth: 2, borderColor: "#c7da30", borderRadius: 6, padding: 20, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 3, alignSelf: "center", marginBottom: 20 },
  inputGroup: { width: "100%", marginBottom: 15 },
  pickerWrapper: { borderColor: "#c7da30", borderWidth: 2, borderRadius: 8, backgroundColor: "#fff", height: 48 },
  pickerDropdown: { borderColor: "#c7da30", borderWidth: 2, borderRadius: 8, backgroundColor: "#fff" },
  submitButton: { borderWidth: 2, borderColor: "#c7da30", paddingVertical: 12, borderRadius: 50, alignItems: "center", width: "70%", marginTop: 10 },
  errorText: { color: "red", marginTop: 4, fontSize: 13, fontFamily: "Montserrat" },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  //mediaItem: { width: "30%", aspectRatio: 1, borderRadius: 8, overflow: "hidden", position: "relative", backgroundColor: "#f0f0f0" },
  mediaItem: {
    width: width < 360 ? "100%" : "48%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f0f0f0",
  },
  mediaThumbnail: { width: "100%", height: "100%", borderRadius: 8 },
  removeButton: { position: "absolute", top: 5, right: 5, backgroundColor: "rgba(255,0,0,0.7)", borderRadius: 12, padding: 4, justifyContent: "center", alignItems: "center" },
  addMediaButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#c7da30", padding: 10, borderRadius: 8 },
  addMediaText: { color: "#555", marginLeft: 6, fontWeight: "500" },
  audioContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#e5e5e5", borderRadius: 8 },
  audioText: { fontSize: 12, color: "#555", marginTop: 5 },
  overlay: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.3)", zIndex: 5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "85%", backgroundColor: "#fff", borderRadius: 12, padding: 25, alignItems: "center" },
  modalTitle: { fontSize: 16, color: "#000", textAlign: "center", marginBottom: 10, fontFamily: "Montserrat" },
  modalCase: { fontSize: 16, color: "#000", marginBottom: 25, textAlign: "center", fontFamily: "Montserrat" },
  modalButton: { backgroundColor: "#fff", width: "100%", padding: 10, borderRadius: 48, justifyContent: "center", alignItems: "center", marginBottom: 10, borderColor: "#c7da30", borderWidth: 2 },
  modalButtonText: { color: "#1aaed3ff", fontWeight: "bold", fontSize: 16 },
  readOnlyField: {
    borderWidth: 2,
    borderColor: "#c7da30",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: "#f5f5f5",
    width: "100%",
    height: 48,
    justifyContent: "center",
    fontFamily: "Montserrat",
  },
  loadingOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", position: "absolute", width: "100%", height: "100%", zIndex: 1000 },
  loadingContainer: { width: 180, padding: 20, backgroundColor: "#fff", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#000", fontFamily: "Montserrat" },
});