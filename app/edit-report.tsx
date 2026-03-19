import MenuToggle from "@/components/menuToggle";
import TopBar from "@/components/toBar";
import { BACKEND_URL } from "@/utils/config";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { Video } from "expo-av";
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
  View
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";

const { width } = Dimensions.get("window");

// Allow common address characters
const ADDRESS_REGEX = /^[a-zA-Z0-9\s@#.,\-\/()]+$/;

// Age–Grade ranges
const GRADE_AGE_RANGES: Record<string, { min: number; max: number }> = {
  Creche: { min: 0, max: 5 },
  "Grade R": { min: 5, max: 7 },
  "Grade 1": { min: 6, max: 10 },
  "Grade 2": { min: 7, max: 13 },
  "Grade 3": { min: 8, max: 14 },
  "Grade 4": { min: 9, max: 15 },
  "Grade 5": { min: 10, max: 16 },
  "Grade 6": { min: 11, max: 16 },
  "Grade 7": { min: 12, max: 16 },
  "Grade 8": { min: 13, max: 20 },
  "Grade 9": { min: 14, max: 20 },
  "Grade 10": { min: 15, max: 20 },
  "Grade 11": { min: 16, max: 20 },
  "Grade 12": { min: 17, max: 22 },
  College: { min: 16, max: 99 },
};

const validateAgeGrade = (age: number, grade: string) => {
  const normalizedGrade = grade?.trim();
  const range = GRADE_AGE_RANGES[normalizedGrade];
  if (!range) return { status: "error", message: "Invalid grade supplied" };
  if (age < range.min || age > range.max)
    return {
      status: "warning",
      message: `Age ${age} is unusual for ${normalizedGrade}`,
    };
  return { status: "ok" };
};

export default function EditReportScreen() {
  const { case_number } = useLocalSearchParams();
  const router = useRouter();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSubtype, setSelectedSubtype] = useState("");
  const [subtypeItems, setSubtypeItems] = useState<any[]>([]);
  const [subtypeOpen, setSubtypeOpen] = useState(false);
  const [media, setMedia] = useState<any>(null);

  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(width))[0];
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const updateReportField = (field: string, value: any) => {
    setReport((prev: any) => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: undefined })); // Clear field error on change
  };

  useEffect(() => {
    if (!case_number) return;
    axios
      .get(`${BACKEND_URL}/reports/case/${case_number}`)
      .then((res) => {
        setReport(res.data);
        setSelectedSubtype(String(res.data.subtype_id));

        if (res.data.image_path) {
          const path = `${BACKEND_URL}${res.data.image_path}`;
          const extension = path.split(".").pop()?.toLowerCase();
          const type = extension === "mp4" ? "video" : "image";
          setMedia({ uri: path, type });
        }
      })
      .catch(() => console.error("Failed to fetch report."));
  }, [case_number]);

  useEffect(() => {
    if (!report?.abuse_type_id) return;
    axios
      .get(`${BACKEND_URL}/reports/subtypes/${report.abuse_type_id}`)
      .then((res) => {
        const formatted = res.data.map((s: any) => ({
          label: s.sub_type_name,
          value: String(s.id),
        }));
        setSubtypeItems(formatted);
        if (report.subtype_id) setSelectedSubtype(String(report.subtype_id));
      })
      .catch(() => console.error("Failed to load subtypes."));
  }, [report?.abuse_type_id]);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.5,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setMedia({ uri: asset.uri, type: asset.type });
    }
  };

  const handleUpdate = async () => {
    if (!report) return;

    const newErrors: any = {};

    // --- Subtype required ---
    if (!selectedSubtype) newErrors.subtype = "Please select a subtype.";

    // --- Email required + format ---
    if (!report.reporter_email) newErrors.reporter_email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.reporter_email))
      newErrors.reporter_email = "Enter a valid email address.";

    // --- Phone required and length ---
    if (!report.phone_number) {
      newErrors.phone_number = "Phone number is required.";
    } else if (!/^\d{10}$/.test(report.phone_number)) {
      newErrors.phone_number = "Phone number must be exactly 10 digits.";
    }

    // --- Grade required before age ---
    if (!report.grade) {
      newErrors.grade = "Grade is required.";
    } else {
      // --- Age required and range check ---
      if (!report.age) {
        newErrors.age = "Age is required.";
      } else {
        const ageNum = parseInt(String(report.age), 10);
        const check = validateAgeGrade(ageNum, report.grade);

        if (check.status === "error") {
          newErrors.grade  = check.message; // block submission
        } else if (check.status === "warning") {
          // show warning but allow submission
          newErrors.age  = check.message;
        }
      }
    }

    // --- Full Name required only if not anonymous ---
    if (report.is_anonymous == 0 && !report.full_name)
      newErrors.full_name = "Full name is required.";
    else if (report.full_name && report.full_name.length > 50)
      newErrors.full_name = "Full name must be less than 50 characters.";

    // --- School required + validations ---
    if (!report.school_name) newErrors.school_name = "School name is required.";
    else if (report.school_name.length > 50)
      newErrors.school_name = "School name must be less than 50 characters.";

    // --- Status required ---
    if (!report.status) newErrors.status = "Status is required.";

    // --- Description validation ---
    if (report.description && report.description.length > 500)
      newErrors.description = "Description must be under 500 characters.";

    // --- Location validation (special characters allowed) ---
    if (report.location) {
      if (report.location.length < 5 || report.location.length > 50) {
        newErrors.location = "Address must be between 5 and 50 characters.";
      } else if (!ADDRESS_REGEX.test(report.location)) {
        newErrors.location = "Address contains invalid characters.";
      }
    } else {
      newErrors.location = "Address is required.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("description", report.description);
      formData.append("phone_number", report.phone_number);
      formData.append("full_name", report.full_name);
      formData.append("age", report.age);
      formData.append("location", report.location);
      formData.append("school_name", report.school_name);
      formData.append("status", report.status);
      formData.append("subtype_id", selectedSubtype.toString());
      formData.append("grade", report.grade);

      if (media && media.uri && !media.uri.startsWith("http")) {
        formData.append(
          "file",
          {
            uri: media.uri,
            name: `report-${Date.now()}.${media.type === "image" ? "jpg" : "mp4"}`,
            type: media.type === "image" ? "image/jpeg" : "video/mp4",
          } as any
        );
      }

      const response = await axios.put(`${BACKEND_URL}/reports/${case_number}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // If malicious, backend returns 403
      if (response.status === 403) {
        router.push("/access-denied");
        return;
      }

      setSuccessModalVisible(true);
    } catch (err: any) {
      if (err.response?.status === 403) {
        router.push("/access-denied");
        return;
      }
      console.error("Update error:", err);
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <TopBar menuVisible={menuVisible} onBack={() => router.back()} onToggleMenu={toggleMenu} />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Text style={styles.title}>Edit Report</Text>
          <Text style={{ marginTop: 5, fontSize: 16, color: "#555" }}>Case Number: {case_number}</Text>
        </View>

        <View style={styles.formWrapper}>
          {/* Subtype */}
          <View style={[styles.inputGroup, { zIndex: 5000 }]}>
            <Text style={styles.label}>Subtype</Text>
            <DropDownPicker
              open={subtypeOpen}
              value={selectedSubtype}
              items={subtypeItems}
              setOpen={setSubtypeOpen}
              setValue={setSelectedSubtype}
              setItems={setSubtypeItems}
              placeholder="Select Subtype"
              style={styles.pickerWrapper}
              dropDownContainerStyle={styles.pickerDropdown}
              placeholderStyle={{ color: "#555" }}
              textStyle={{ fontSize: 15, color: "#000" }}
            />
            {errors.subtype && <Text style={styles.errorText}>{errors.subtype}</Text>}
          </View>

          {/* Full Name */}
          {report.is_anonymous == 0 && (
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
            <Text style={styles.label}>Attachment</Text>
            <TouchableOpacity style={styles.imageCard} onPress={pickMedia}>
              {media ? (
                media.type === "image" ? (
                  <Image source={{ uri: media.uri }} style={styles.imageInsideCard} />
                ) : (
                  <Video
                    source={{ uri: media.uri }}
                    style={styles.imageInsideCard}
                    useNativeControls
                    resizeMode={"contain" as any}
                    shouldPlay={false}
                  />
                )
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={{ color: "#555", fontWeight: "500" }}>Choose Image/Video</Text>
                  <Ionicons name="camera" size={24} color="#555" style={{ marginLeft: 10 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity style={[styles.submitButton, { alignSelf: "center" }]} onPress={handleUpdate}>
          <Text style={styles.submitText}>{loading ? "Updating..." : "Update Report"}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <Modal visible={loading || successModalVisible} transparent animationType="fade">
  {/* Loading overlay */}
  {loading && (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c7da30" />
        <Text style={styles.loadingText}>Updating report...</Text>
      </View>
    </View>
  )}

  {/* Success modal */}
  {successModalVisible && !loading && (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>REPORT UPDATED SUCCESSFULLY</Text>
        <Image
          source={require("../assets/images/right.jpeg")}
          style={{ width: 60, height: 60, marginBottom: 15 }}
          resizeMode="contain"
        />
        <Text style={styles.modalCase}>CASE NUMBER: {case_number}</Text>
        <TouchableOpacity
          style={styles.modalButton}
          onPress={() => {
            setSuccessModalVisible(false);
            router.push("/"); // Navigate home
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
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/check-status"); // Go home if no back screen
                }
              }}
              onClose={() => setMenuVisible(false)}
            />
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { flexGrow: 1, paddingVertical: 20, paddingHorizontal: 15 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },

  // Text Styles
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
  descriptionInput: { height: 100, textAlignVertical: "top", fontFamily: "Montserrat" },
  submitText: { color: "#1aaed3ff", fontWeight: "500", fontSize: 16, fontFamily: "Montserrat" },

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

  pickerWrapper: { borderColor: "#c7da30", borderWidth: 2, borderRadius: 8, backgroundColor: "#fff", height: 48 },
  pickerDropdown: { borderColor: "#c7da30", borderWidth: 2, borderRadius: 8, backgroundColor: "#fff" },

  imageCard: {
    borderWidth: 2,
    borderColor: "#c7da30",
    borderRadius: 8,
    backgroundColor: "#fff",
    width: "100%",
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageInsideCard: { width: "100%", height: "100%", resizeMode: "cover", borderRadius: 8 },
  imagePlaceholder: { flexDirection: "row", alignItems: "center" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "85%", backgroundColor: "#fff", borderRadius: 12, padding: 25, alignItems: "center" },
  modalTitle: { fontSize: 16, color: "#000", textAlign: "center", marginBottom: 10, fontFamily: "Montserrat" },
  modalCase: { fontSize: 16, color: "#000", marginBottom: 25, textAlign: "center", fontFamily: "Montserrat" },
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
  modalButtonText: { color: "#1aaed3ff", fontWeight: "500", fontSize: 16, fontFamily: "Montserrat" },

  overlay: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.3)", zIndex: 5 },

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
  loadingContainer: { width: 180, padding: 20, backgroundColor: "#fff", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#000", fontFamily: "Montserrat" },

  errorText: { color: "red", marginTop: 4, fontSize: 13, fontFamily: "Montserrat" },

  submitButton: {
    borderWidth: 2,
    borderColor: "#c7da30",
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: "center",
    width: "70%",
    marginTop: 10,
  },
});

