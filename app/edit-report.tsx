import { validateAgeGrade } from "@/components/ageGradeValidator";
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
  FlatList,
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

const { width, height } = Dimensions.get("window");

// Allow common address characters
const ADDRESS_REGEX = /^[a-zA-Z0-9\s@#.,\-\/()]+$/;

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
  const [media, setMedia] = useState<any[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(width))[0];
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isAnonymous = report?.is_anonymous == 1;
  const [school, setSchool] = useState("");
  const [schoolSuggestions, setSchoolSuggestions] = useState<any[]>([]);
  const [schoolProvince, setSchoolProvince] = useState("");
  const [grade, setGrade] = useState("");
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradeItems, setGradeItems] = useState<any[]>([
    { label: "Creche", value: "Creche" },
    { label: "Grade R", value: "Grade R" },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `Grade ${i + 1}`,
      value: `Grade ${i + 1}`,
    })),
  ]);
  const provinces = [
    "gauteng",
    "limpopo",
    "mpumalanga",
    "north west",
    "free state",
    "kwazulu-natal",
    "eastern cape",
    "western cape",
    "northern cape",
  ];

  const updateReportField = (field: string, value: any) => {
    setReport((prev: any) => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: undefined }));
  };

  // 🎵 STOP AUDIO
  const stopAudio = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
    } catch (e) {
      console.log("stopAudio error:", e);
    } finally {
      setSound(null);
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  };

  // 🎵 PLAY AUDIO
  const toggleAudioPreview = async (file: any) => {
    try {
      if (!file?.uri) return;

      if (currentAudio === file.uri && isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }

      await stopAudio();

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: file.uri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setCurrentAudio(file.uri);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setCurrentAudio(null);
        }
      });
    } catch (error) {
      console.log("Audio preview error:", error);
    }
  };

  // 🎵 AUDIO CLEANUP
  useEffect(() => {
    return () => {
      if (sound) {
        sound.stopAsync().then(() => sound.unloadAsync()).catch(() => {});
      }
    };
  }, []);

  // school Search Function
  const searchSchools = async (text: string) => {
    setSchool(text);
    if (text.length < 1) {
      setSchoolSuggestions([]);
      return;
    }
    try {
      const res = await axios.get(
        `${BACKEND_URL}/schools/search?q=${encodeURIComponent(text)}`,
      );
      setSchoolSuggestions(res.data);
    } catch (err) {
      console.error("Error fetching schools:", err);
    }
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
        setSchoolProvince(res.data.school_province || "");

        if (res.data.school_name) {
          setSchool(res.data.school_name);
        }

        if (res.data.grade) {
          setGrade(res.data.grade);
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
                else if (["mp3", "wav", "m4a"].includes(extension || ""))
                  type = "audio";

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
    axios
      .get(`${BACKEND_URL}/reports/abuse-types`)
      .then((res) => {
        const formatted = res.data.map((item: any) => ({
          label: item.type_name,
          value: String(item.id),
        }));
        setAbuseTypeItems(formatted);
      })
      .catch((err) => console.log("Failed to load report types", err));
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

        if (report?.subtype_id) {
          setSelectedSubtype(String(report.subtype_id));
        }
      })
      .catch(() => console.log("Failed to fetch subtypes"));
  }, [selectedAbuseType]);

  const isOtherSubtype = () => {
    const selected = subtypeItems.find(
      (item) => item.value === selectedSubtype,
    );
    return selected?.label?.toLowerCase() === "other";
  };

  // Pick Media - UPDATED to use DocumentPicker with multiple files
  const pickMedia = async () => {
    await stopAudio();

    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "video/*", "audio/*"],
      copyToCacheDirectory: true,
      multiple: true,
    });

    if (result.canceled) return;

    const newFiles = result.assets.map((file) => {
      let type = "file";
      if (file.mimeType?.startsWith("image")) type = "image";
      else if (file.mimeType?.startsWith("video")) type = "video";
      else if (file.mimeType?.startsWith("audio")) type = "audio";
      
      return {
        uri: file.uri,
        name: file.name,
        type: type,
      };
    });

    setMedia((prev) => [...prev, ...newFiles]);
  };

  useEffect(() => {
    if (report && !report.subtype_id) {
      setSelectedSubtype("");
    }
  }, [selectedAbuseType]);

  const handleUpdate = async () => {
    if (!report) return;
    const newErrors: any = {};
    if (!selectedSubtype) newErrors.subtype = "Please select a subtype.";
    if (!report.reporter_email) newErrors.reporter_email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.reporter_email))
      newErrors.reporter_email = "Enter a valid email address.";
    if (!report.phone_number)
      newErrors.phone_number = "Phone number is required.";
    else if (!/^\d{10}$/.test(report.phone_number))
      newErrors.phone_number = "Phone number must be 10 digits.";
    if (!grade) newErrors.grade = "Grade is required.";
    else if (!report.age) newErrors.age = "Age is required.";
    else {
      const check = validateAgeGrade(parseInt(String(report.age), 10), grade);
      if (check.status === "error") {
        newErrors.grade = check.message;
      } else if (check.status === "warning") {
        newErrors.age = check.message;
      }
    }
    if (!isAnonymous && !report.full_name?.trim()) {
      newErrors.full_name = "Full name is required.";
    } else if (report.full_name && report.full_name.length > 50)
      newErrors.full_name = "Full name must be less than 50 characters.";
    if (!school.trim()) {
      newErrors.school_name = "School name is required.";
    } else if (school.length > 50) {
      newErrors.school_name = "School name must be less than 50 characters.";
    } else {
      updateReportField("school_name", school);

      const lowerSchoolName = school.toLowerCase();
      const lowerGrade = grade.toLowerCase();

      const isPrimaryGrade =
        lowerGrade.includes("grade r") ||
        lowerGrade === "creche" ||
        [
          "grade 1",
          "grade 2",
          "grade 3",
          "grade 4",
          "grade 5",
          "grade 6",
          "grade 7",
        ].includes(lowerGrade);

      const isSecondarySchool =
        lowerSchoolName.includes("secondary") ||
        lowerSchoolName.includes("high school");

      if (isPrimaryGrade && isSecondarySchool) {
        newErrors.school_name =
          "Grade R–7 learners cannot be linked to a secondary/high school.";
      }
    }
    if (!report.status) newErrors.status = "Status is required.";

    if (isOtherSubtype()) {
      if (!report.description || report.description.trim() === "") {
        newErrors.description = "Description is required.";
      }
    } else {
      if (report.description && report.description.length > 500) {
        newErrors.description = "Description must be under 500 characters.";
      }
    }
    if (report.location) {
      if (report.location.length < 5 || report.location.length > 50)
        newErrors.location = "Address must be between 5 and 50 characters.";
      else if (!ADDRESS_REGEX.test(report.location))
        newErrors.location = "Address contains invalid characters.";
      else {
        const lowerLocation = report.location.toLowerCase();

        const matchedProvince = provinces.find((province) =>
          lowerLocation.includes(province),
        );

        if (!matchedProvince) {
          newErrors.location = "Please include the province in the address.";
        } else if (
          schoolProvince &&
          matchedProvince !== schoolProvince.toLowerCase()
        ) {
          newErrors.location = `The selected school belongs to ${schoolProvince}, but the address is in another province.`;
        }
      }
    } else {
      newErrors.location = "Address is required.";
    }

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
      formData.append("grade", grade);

      const existingFiles = media
        .filter((m) => m.uri.startsWith(BACKEND_URL))
        .map((m) => m.uri.replace(BACKEND_URL, ""));
      formData.append("existingFiles", JSON.stringify(existingFiles));

      const newFiles = media.filter((m) => !m.uri.startsWith(BACKEND_URL));
      newFiles.forEach((item, index) => {
        const type =
          item.type === "image"
            ? "image/jpeg"
            : item.type === "video"
              ? "video/mp4"
              : "audio/mpeg";
        const ext =
          item.type === "image" ? "jpg" : item.type === "video" ? "mp4" : "mp3";
        formData.append("files", {
          uri: item.uri,
          name: `report-${Date.now()}-${index}.${ext}`,
          type,
        } as any);
      });

      const response = await axios.put(
        `${BACKEND_URL}/reports/${case_number}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

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
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: width * 0.3,
        duration: 250,
        useNativeDriver: true,
      }).start();
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ marginTop: -45 }}>
        <TopBar
          menuVisible={menuVisible}
          onBack={() => router.back()}
          onToggleMenu={toggleMenu}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}  // ✅ ADD THIS ONE LINE
      >
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Text style={styles.title}>Edit Report</Text>
          <Text style={{ marginTop: 5, fontSize: 16, color: "#555" }}>
            Case Number: {case_number}
          </Text>
        </View>

        <View style={styles.formWrapper}>
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
              zIndexInverse={1000}
              listMode="SCROLLVIEW"
            />
          </View>

          {/* Subtype */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sub-type</Text>
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
              zIndexInverse={2000}
              listMode="SCROLLVIEW"
              dropDownDirection="BOTTOM"
            />
            {errors.subtype && (
              <Text style={styles.errorText}>{errors.subtype}</Text>
            )}
          </View>

          {/* Full Name */}
          {!isAnonymous && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={report.full_name}
                onChangeText={(text) => updateReportField("full_name", text)}
              />
              {errors.full_name && (
                <Text style={styles.errorText}>{errors.full_name}</Text>
              )}
            </View>
          )}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={report.reporter_email}
              onChangeText={(text) => updateReportField("reporter_email", text)}
            />
            {errors.reporter_email && (
              <Text style={styles.errorText}>{errors.reporter_email}</Text>
            )}
          </View>

          {/* Phone & Age */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 15,
            }}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={report.phone_number}
                onChangeText={(text) => updateReportField("phone_number", text)}
                keyboardType="number-pad"
              />
              {errors.phone_number && (
                <Text style={styles.errorText}>{errors.phone_number}</Text>
              )}
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
            {errors.location && (
              <Text style={styles.errorText}>{errors.location}</Text>
            )}
          </View>

          {/* School & Grade */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 15,
            }}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Name of School</Text>
              <TextInput
                style={[styles.input, errors.school_name && styles.inputError]}
                value={school}
                onChangeText={(text) => {
                  searchSchools(text);
                  if (text.trim().length >= 1) {
                    setErrors((prev: any) => ({ ...prev, school_name: "" }));
                  }
                }}
                placeholder="Start typing school name..."
                placeholderTextColor="#999"
              />
              {errors.school_name && (
                <Text style={styles.errorText}>{errors.school_name}</Text>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Grade</Text>
              <DropDownPicker
                open={gradeOpen}
                value={grade}
                items={gradeItems}
                setOpen={setGradeOpen}
                setValue={setGrade}
                setItems={setGradeItems}
                placeholder="Select Grade"
                style={styles.pickerWrapper}
                dropDownContainerStyle={styles.pickerDropdown}
                zIndex={4000}
                zIndexInverse={1000}
                listMode="SCROLLVIEW"
              />
              {errors.grade && (
                <Text style={styles.errorText}>{errors.grade}</Text>
              )}
            </View>
          </View>

          {/* School Suggestions */}
          {schoolSuggestions.length > 0 && (
            <View style={styles.suggestionsOverlay}>
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Select School:</Text>
                <FlatList
                  data={schoolSuggestions}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setSchool(item.school_name);
                        setSchoolProvince(item.province);
                        setSchoolSuggestions([]);
                        setErrors((prev: any) => ({
                          ...prev,
                          school_name: "",
                        }));
                        updateReportField("school_name", item.school_name);
                      }}
                      style={styles.suggestionItem}
                    >
                      <Text style={styles.suggestionText}>
                        {item.school_name} ({item.province})
                      </Text>
                    </TouchableOpacity>
                  )}
                  nestedScrollEnabled={true}
                />
                <TouchableOpacity
                  style={styles.closeSuggestionsButton}
                  onPress={() => setSchoolSuggestions([])}
                >
                  <Text style={styles.closeSuggestionsText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Description{" "}
              {isOtherSubtype() ? (
                <Text style={{ color: "red" }}>(Required)</Text>
              ) : (
                "(Optional)"
              )}
            </Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              value={report.description}
              onChangeText={(text) => {
                updateReportField("description", text);
                if (errors.description) {
                  setErrors((prev: any) => ({
                    ...prev,
                    description: undefined,
                  }));
                }
              }}
              multiline
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          {/* Media - UPDATED with Choose File button */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Attachments</Text>
            
            {/* Choose File Button */}
            <View style={styles.filePickerWrapper}>
              <TouchableOpacity
                style={styles.chooseFileButton}
                onPress={pickMedia}
              >
                <Text style={styles.chooseFileText}>Choose File</Text>
              </TouchableOpacity>
              <Text style={styles.fileNameText}>
                {media.length > 0
                  ? `${media.length} file(s) selected`
                  : "No file chosen"}
              </Text>
            </View>

            {/* Display Attachments */}
            {media.map((file, index) => (
              <View key={index} style={{ marginBottom: 12 }}>
                {/* IMAGE */}
                {file.type === "image" && (
                  <Image
                    source={{ uri: file.uri }}
                    style={styles.imagePreview}
                  />
                )}

                {/* VIDEO */}
                {file.type === "video" && (
                  <Video
                    source={{ uri: file.uri }}
                    style={styles.videoPreview}
                    useNativeControls
                    resizeMode={"contain" as any}
                  />
                )}

                {/* AUDIO */}
                {file.type === "audio" && (
                  <TouchableOpacity
                    onPress={() => toggleAudioPreview(file)}
                    style={styles.audioPreviewButton}
                  >
                    <Text style={styles.audioPreviewText}>
                      {currentAudio === file.uri && isPlaying
                        ? "⏸ Pause Audio"
                        : "▶ Play Audio"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* REMOVE BUTTON */}
                <TouchableOpacity
                  onPress={() => {
                    stopAudio();
                    setMedia((prev) => prev.filter((_, i) => i !== index));
                  }}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, { alignSelf: "center" }]}
          onPress={handleUpdate}
        >
          <Text style={styles.submitText}>
            {loading ? "Updating..." : "Update Report"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <Modal
        visible={loading || successModalVisible}
        transparent
        animationType="fade"
      >
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
              <Image
                source={require("../assets/images/right.jpeg")}
                style={{ width: 60, height: 60, marginBottom: 15 }}
                resizeMode="contain"
              />
              <Text style={styles.modalCase}>
                REFERENCE NUMBER: {case_number}
              </Text>
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

      {menuVisible && (
        <TouchableOpacity style={styles.overlay} onPress={toggleMenu} />
      )}
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

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { flexGrow: 1, paddingVertical: 20, paddingHorizontal: 15 },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    color: "black",
    fontFamily: "Montserrat",
  },
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
  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
    fontFamily: "Montserrat",
  },
  submitText: { color: "#1aaed3ff", fontWeight: "bold", fontSize: 16 },
  formWrapper: {
    width: "100%",
    maxWidth: 800,
    borderWidth: 2,
    borderColor: "#c7da30",
    borderRadius: 6,
    padding: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  inputGroup: { width: "100%", marginBottom: 15 },
  pickerWrapper: {
    borderColor: "#c7da30",
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: "#fff",
    height: 48,
  },
  pickerDropdown: {
    borderColor: "#c7da30",
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  submitButton: {
    borderWidth: 2,
    borderColor: "#c7da30",
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: "center",
    width: "70%",
    marginTop: 10,
  },
  errorText: {
    color: "red",
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Montserrat",
  },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  mediaItem: {
    width: width < 360 ? "100%" : "48%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f0f0f0",
  },
  mediaThumbnail: { width: "100%", height: "100%", borderRadius: 8 },
  removeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(255,0,0,0.7)",
    borderRadius: 12,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  addMediaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#c7da30",
    padding: 10,
    borderRadius: 8,
  },
  addMediaText: { color: "#555", marginLeft: 6, fontWeight: "500" },
  audioContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e5e5e5",
    borderRadius: 8,
  },
  audioText: { fontSize: 12, color: "#555", marginTop: 5 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 25,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    color: "#000",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "Montserrat",
  },
  modalCase: {
    fontSize: 16,
    color: "#000",
    marginBottom: 25,
    textAlign: "center",
    fontFamily: "Montserrat",
  },
  modalButton: {
    backgroundColor: "#fff",
    width: "100%",
    padding: 10,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderColor: "#c7da30",
    borderWidth: 2,
  },
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
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 1000,
  },
  loadingContainer: {
    width: 180,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#000",
    fontFamily: "Montserrat",
  },
  suggestionsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: height * 0.15,
    paddingHorizontal: width * 0.05,
  },
  suggestionsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: width * 0.04,
    width: "90%",
    maxHeight: height * 0.4,
    borderWidth: 2,
    borderColor: "#c7da30",
    elevation: 10,
  },
  suggestionsTitle: {
    fontSize: width * 0.045,
    fontWeight: "bold",
    marginBottom: height * 0.01,
    fontFamily: "Montserrat",
  },
  suggestionItem: {
    paddingVertical: height * 0.008,
  },
  suggestionText: {
    fontSize: width * 0.04,
    fontFamily: "Montserrat",
  },
  closeSuggestionsButton: {
    marginTop: height * 0.01,
    alignSelf: "center",
  },
  closeSuggestionsText: {
    color: "#c7da30",
    fontWeight: "bold",
    fontFamily: "Montserrat",
  },
  inputError: {
    borderColor: "red",
  },
  // New styles 
  filePickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#c7da30",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    height: 48,
    marginBottom: 10,
  },
  chooseFileButton: {
    backgroundColor: "#d3d3d3",
    paddingHorizontal: 15,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  chooseFileText: {
    color: "#000",
    fontWeight: "500",
    fontFamily: "Montserrat",
  },
  fileNameText: {
    flex: 1,
    paddingHorizontal: 10,
    color: "#555",
    fontFamily: "Montserrat",
  },
  imagePreview: {
    width: "100%",
    height: height * 0.15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#c7da30",
    marginTop: 5,
  },
  videoPreview: {
    width: "100%",
    height: height * 0.23,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#c7da30",
  },
  audioPreviewButton: {
    borderWidth: 2,
    borderColor: "#c7da30",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginTop: 5,
  },
  audioPreviewText: {
    fontSize: 16,
    fontFamily: "Montserrat",
  },
  removeText: {
    color: "red",
    textAlign: "center",
    marginTop: 5,
    fontFamily: "Montserrat",
  },
});