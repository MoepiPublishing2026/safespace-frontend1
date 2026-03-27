import { BACKEND_URL } from "@/utils/config";
import axios from "axios";
import { Audio, Video } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
  View
} from "react-native";

import DropDownPicker from "react-native-dropdown-picker";

import MenuToggle from "@/components/menuToggle";
import TopBar from "@/components/toBar";

const { width, height } = Dimensions.get("window");

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
    return { status: "warning", message: `Age ${age} is unusual for ${normalizedGrade}` };
    return { status: "ok" };
};


export default function CreateReportScreen() {
  const { abuseTypeId, abuseTypeName, anonymous } = useLocalSearchParams();
  const router = useRouter();

  const [subtypes, setSubtypes] = useState<any[]>([]);
  const [selectedSubtype, setSelectedSubtype] = useState("");
  const [subtypeOpen, setSubtypeOpen] = useState(false);
  const [subtypeItems, setSubtypeItems] = useState<any[]>([]);

  const [fullName, setFullName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
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
  const [school, setSchool] = useState("");
  const [schoolSuggestions, setSchoolSuggestions] = useState<any[]>([]);
  const [image, setImage] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(width))[0];
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submittedCaseNumber, setSubmittedCaseNumber] = useState("");
   const [activeMenuItem, setActiveMenuItem] = useState<string | null>(null);
   const [attachments, setAttachments] = useState<any[]>([]);
   const [currentAudio, setCurrentAudio] = useState<string | null>(null);

  // 🎵 AUDIO STATE
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // errors state for inline messages
  const [errors, setErrors] = useState<{
    subtype?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    age?: string;
    school?: string;
    location?: string;
    description?: string;
    grade?: string;
  }>({});

  // Fetch subtypes
  useEffect(() => {
    if (!abuseTypeId) return;
    axios
      .get(`${BACKEND_URL}/reports/subtypes/${abuseTypeId}`)
      .then((res) => setSubtypes(res.data))
      .catch((err) => console.error("Error fetching subtypes:", err));
  }, [abuseTypeId]);

 // Convert subtypes to dropdown items
  useEffect(() => {
    setSubtypeItems(
      subtypes.map((s) => ({ label: s.sub_type_name, value: String(s.id) }))
    );
  }, [subtypes]);

  useEffect(() => {
    if (anonymous === "yes") setIsAnonymous(true);
    else setIsAnonymous(false);
  }, [anonymous]);

  // 🎵 AUDIO CLEANUP ON SCREEN EXIT
  useEffect(() => {
    return () => {
      if (sound) {
        sound.stopAsync().then(() => sound.unloadAsync()).catch(() => {});
      }
    };
  }, []);

  // 🎵 STOP AUDIO WHEN NEW CASE IS SEARCHED OR ATTACHMENT CHANGED
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

  const pickMedia = async () => {
    await stopAudio();
  
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "video/*", "audio/*"],
      copyToCacheDirectory: true,
      multiple: true
    });
  
    if (result.canceled) return;
  
    const newFiles = result.assets.map(file => ({
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/octet-stream",
    }));
  
    setAttachments(prev => [...prev, ...newFiles]);
  };
  const searchSchools = async (text: string) => {
    setSchool(text);
    if (text.length < 1) {
      setSchoolSuggestions([]);
      return;
    }
    try {
      const res = await axios.get(`${BACKEND_URL}/schools/search?q=${encodeURIComponent(text)}`);
      setSchoolSuggestions(res.data);
    } catch (err) {
      console.error("Error fetching schools:", err);
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // --- Subtype required ---
    if (!selectedSubtype) newErrors.subtype = "Please select a subtype.";

    // --- Full name required only if not anonymous ---
    if (!isAnonymous) {
      if (!fullName.trim()) newErrors.fullName = "Full name is required.";
      else if (fullName.length > 50)
        newErrors.fullName = "Full name must be less than 50 characters.";
    }

    // --- Email required + format ---
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      newErrors.email = "Enter a valid email address.";

   // --- Phone required and length ---
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (!/^\d{10}$/.test(phone)) {
      newErrors.phone = "Phone number must be exactly 10 digits.";
    }

    // --- Grade required before age ---
    if (!grade) {
      newErrors.grade = "Grade is required.";
    } else {
      // --- Age required and range check ---
      if (!age.trim()) {
        newErrors.age = "Age is required.";
      } else {
        const ageNum = parseInt(age, 10);
        const check = validateAgeGrade(ageNum, grade);

        if (check.status === "error") {
          newErrors.age = check.message; // block submission
        } else if (check.status === "warning") {
          // show warning but allow submission
          newErrors.age = check.message;
        }
      }
    }

    // --- School required + validations ---
    if (!school.trim()) newErrors.school = "School name is required.";
    else if (school.length > 50)
      newErrors.school = "School name must be less than 50 characters.";

    // --- Description required for "Other" subtype ---
    const descriptionRequired =
      subtypes.find((s) => String(s.id) === selectedSubtype)
        ?.sub_type_name === "Other";
    if (descriptionRequired && !description.trim())
      newErrors.description = "Description is required for this report.";

    // --- Location validation (special characters allowed) ---
    if (location) {
      if (location.length < 5 || location.length > 50) {
        newErrors.location = "Address must be between 5 and 50 characters.";
      } else if (!ADDRESS_REGEX.test(location)) {
        newErrors.location = "Address contains invalid characters.";
      }
    }

    setErrors(newErrors);

    

    // Return true if no errors
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("abuse_type_id", abuseTypeId as string);
      formData.append("subtype_id", selectedSubtype);
      formData.append("description", description);
      formData.append("reporter_email", email);
      formData.append("phone_number", phone);
      formData.append("age", age);
      formData.append("location", location);
      formData.append("school_name", school);
      formData.append("grade", grade);
      formData.append("status", "awaiting-resolution");
      formData.append("is_anonymous", isAnonymous ? "1" : "0");

      // Append full_name only if the user is NOT anonymous
      if (!isAnonymous && fullName.trim()) {
        formData.append("full_name", fullName);
      }

      attachments.forEach((file, index) => {
        formData.append("files", {
          uri: file.uri,
          name: file.name || `file-${index}`,
          type: file.type || "application/octet-stream",
        } as any);
      });

      const response = await fetch(`${BACKEND_URL}/reports`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      // If malicious, backend returns 403
      if (response.status === 403) {
        router.push("/access-denied");
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      setSubmittedCaseNumber(result.case_number);
      setSuccessModalVisible(true);

      // Clear form
      setSelectedSubtype("");
      setDescription("");
      setEmail("");
      setPhone("");
      setFullName("");
      setAge("");
      setLocation("");
      setSchool("");
      setGrade("");
      setAttachments([]);
      setSchoolSuggestions([]);
      setErrors({});

     // Stop audio when form resets
      await stopAudio();
    } catch (err: any) {
      console.error("Submission error:", err);
      setErrors((prev) => ({ ...prev, description: "Failed to create report." }));
    } finally {
      setLoading(false);
    }
  };

   // 🎵 Play/Pause Audio
   const toggleAudioPreview = async (file: any) => {
    try {
      if (!file?.uri) return;
  
      // If same audio is playing → pause it
      if (currentAudio === file.uri && isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }
  
      // Stop previous audio completely
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

  const handleNavigate = (path: string) => {
    toggleMenu();
    setTimeout(() => {
      router.push({ pathname: path as any });
    }, 250);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >

      <TopBar
        menuVisible={menuVisible}
        onBack={() => router.back()}
        onToggleMenu={toggleMenu}
      />
      <ScrollView
        contentContainerStyle={styles.container}
        scrollEnabled={!subtypeOpen && !gradeOpen && schoolSuggestions.length === 0}


        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>REPORT A CASE</Text>
        {isAnonymous && (
          <Text style={{ color: "black", marginBottom: 10 ,fontSize: width * 0.04}}>
            You are reporting anonymously
          </Text>
        )}
        <Text style={styles.abuseTypeText}>Report Type: {abuseTypeName}</Text>

        <View style={styles.formWrapper}>
          {/* Subtype */}
          {schoolSuggestions.length === 0 && (
            <View style={styles.fullField}>
              <Text style={styles.label}>Subtype</Text>
              <DropDownPicker
                open={subtypeOpen}
                value={selectedSubtype}
                items={subtypeItems}
                setOpen={setSubtypeOpen}
                setValue={setSelectedSubtype}
                onChangeValue={(val) => setErrors((prev) => ({ ...prev, subtype: "" }))}


                setItems={setSubtypeItems}
                placeholder="Select Subtype"
                style={styles.pickerWrapper}
                dropDownContainerStyle={{ borderColor: "#c7da30" }}
                zIndex={5000}
              />
              {errors.subtype ? <Text style={styles.errorText}>{errors.subtype}</Text> : null}


            </View>
          )}

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                keyboardType="number-pad"
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9]/g, "");
                  setAge(cleaned);
                  if (cleaned && parseInt(cleaned, 10) >= 1 && parseInt(cleaned, 10) <= 115) {




                    setErrors((prev) => ({ ...prev, age: "" }));
                  }
                }}
              />
              {errors.age ? <Text style={styles.errorText}>{errors.age}</Text> : null}


            </View>
            <View style={styles.fieldLast}>
              <Text style={styles.label}>School Name</Text>
              <TextInput
                style={styles.input}
                value={school}
                onChangeText={(text) => {
                  searchSchools(text);
                  if (text.trim().length >= 1) {
                    setErrors((prev) => ({ ...prev, school: "" }));
                  }
                }}
                placeholder="Start typing school name..."
                placeholderTextColor="#999"
              />
              {errors.school ? <Text style={styles.errorText}>{errors.school}</Text> : null}


            </View>
          </View>

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
                        setSchoolSuggestions([]);
                        setErrors((prev) => ({ ...prev, school: "" }));
                      }}
                      style={styles.suggestionItem}
                    >
                      <Text style={styles.suggestionText}>
                        {item.school_name} ({item.province})

                      </Text>
                    </TouchableOpacity>
                  )}
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

          {/* Grade */}
          {schoolSuggestions.length === 0 && (
            <View style={styles.row}>
              <View style={styles.fieldLast}>
                <Text style={styles.label}>Grade</Text>
                <DropDownPicker
                  open={gradeOpen}
                  value={grade}
                  items={gradeItems}
                  setOpen={setGradeOpen}
                  setValue={setGrade}
                  onChangeValue={(val) => setErrors((prev) => ({ ...prev, grade: "" }))}


                  setItems={setGradeItems}
                  placeholder="Select Grade"
                  style={styles.pickerWrapper}
                  dropDownContainerStyle={{ borderColor: "#c7da30" }}
                  zIndex={4000}
                />
                {errors.grade ? <Text style={styles.errorText}>{errors.grade}</Text> : null}


              </View>
            </View>
          )}

          {/* Full name when not anonymous */}
          {!isAnonymous && (
            <View style={styles.fullField}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={(t) => {
                  setFullName(t);
                  if (t.trim().length >= 1 && t.trim().length <= 50) {
                    setErrors((prev) => ({ ...prev, fullName: "" }));
                  }
                }}
              />
              {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}


            </View>
          )}

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.trim())) {
                    setErrors((prev) => ({ ...prev, email: "" }));
                  }
                }}
                keyboardType="email-address"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}


            </View>
            <View style={styles.fieldLast}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9]/g, "");
                  setPhone(cleaned);
                  if (cleaned.length >= 10 && cleaned.length <= 15) {
                    setErrors((prev) => ({ ...prev, phone: "" }));
                  }
                }}
                keyboardType="number-pad"
              />
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}


            </View>
          </View>

          <View style={styles.fullField}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={(t) => {
                setLocation(t);
                if (t.length >= 5 && t.length <= 50) {
                  setErrors((prev) => ({ ...prev, location: "" }));
                }
              }}
            />
            {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}


          </View>

          <View style={styles.fullField}>
            <Text style={styles.label}>
              Description{" "}
              {subtypes.find((s) => String(s.id) === selectedSubtype)
                ?.sub_type_name === "Other" ? (
                <Text style={{ color: "red" }}>(Required)</Text>
              ) : (
                <Text style={{ color: "grey" }}>(Optional)</Text>
              )}
            </Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              value={description}
              onChangeText={(t) => {
                setDescription(t);
                const subtypeName = subtypes.find((s) => String(s.id) === selectedSubtype)
                  ?.sub_type_name;

                if (subtypeName !== "Other") {
                  setErrors((prev) => ({ ...prev, description: "" }));
                } else if (t.trim().length > 0) {
                  setErrors((prev) => ({ ...prev, description: "" }));
                }
              }}
              multiline
            />
            {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}


          </View>

          {/* Attachment */}
          <View style={styles.fullField}>
            <Text style={styles.label}>Attachment (Optional)</Text>
            <View style={styles.filePickerWrapper}>
              <TouchableOpacity
                style={styles.chooseFileButton}
                onPress={pickMedia}
              >
                <Text style={styles.chooseFileText}>Choose File</Text>
              </TouchableOpacity>
              <Text style={styles.fileNameText}>
              {attachments.length > 0
  ? `${attachments.length} file(s) selected`
  : "No file chosen"}


              </Text>
            </View>

           
            {attachments.map((file, index) => (
  <View key={index} style={{ marginBottom: 12 }}>

    {/* IMAGE */}
    {file.type?.startsWith("image") && (
      <Image
        source={{ uri: file.uri }}
        style={styles.imagePreview}
      />
    )}

    {/* VIDEO */}
    {file.type?.startsWith("video") && (
      <Video
        source={{ uri: file.uri }}
        style={styles.videoPreview}
        useNativeControls
        resizeMode={"contain" as any}
      />
    )}

    {/* AUDIO */}
    {file.type?.startsWith("audio") && (
  <TouchableOpacity
    onPress={async () => {
      toggleAudioPreview(file);
    }}
    style={{
      borderWidth: 2,
      borderColor: "#c7da30",
      borderRadius: 8,
      padding: 10,
      alignItems: "center",
    }}
  >
    <Text>
      {currentAudio === file.uri && isPlaying
        ? "⏸ Pause Audio"
        : "▶ Play Audio"}
    </Text>
  </TouchableOpacity>
)}

    {/* REMOVE BUTTON */}
    <TouchableOpacity
      onPress={() =>
        setAttachments(prev => prev.filter((_, i) => i !== index))
      }
    >
      <Text style={{ color: "red", textAlign: "center", marginTop: 5 }}>
        Remove
      </Text>
    </TouchableOpacity>

  </View>
))}

           

          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>
              {loading ? "Submitting..." : "Submit"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Big Loading Modal (keeps your design & logic) */}

      <Modal visible={loading || successModalVisible} transparent animationType="fade">




        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#c7da30" />
              <Text style={styles.loadingText}>Submitting report…</Text>
            </View>
          </View>
        )}

        {successModalVisible && !loading && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>DETAILS SUBMITTED SUCCESSFULLY</Text>


              <Image
                source={require("../assets/images/right.jpeg")}
                style={{ width: 60, height: 60, marginBottom: 15 }}
                resizeMode="contain"
              />
              <Text style={styles.modalCase}>REFERENCE NUMBER: {submittedCaseNumber}</Text>


              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setSuccessModalVisible(false);
                  router.push("/");
                }}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>


      {/* Slide-in menu from right */}
      {menuVisible && (
        <TouchableOpacity style={styles.overlay} onPress={toggleMenu} />
      )}
      <MenuToggle
        menuVisible={menuVisible}
        slideAnim={slideAnim}
        onNavigate={handleNavigate}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.push("/abuse-types"); // Go home if no back screen
          }
        }}
        onClose={() => setMenuVisible(false)}
      />

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: height * 0.03,
    alignItems: "center",
    width: "100%",
    paddingHorizontal: width * 0.03,
  },

  title: {
    fontSize: width * 0.07,
    fontWeight: "bold",
    marginBottom: height * 0.02,
    color: "black",
  },

  abuseTypeText: {
    fontSize: width * 0.045,
    fontWeight: "bold",
    marginBottom: height * 0.01,
  },

  formWrapper: {
    width: "100%",
    maxWidth: width * 0.95,
    minWidth: 300,
    borderWidth: 2,
    borderColor: "#c7da30",
    borderRadius: 6,
    padding: width * 0.05,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
    alignSelf: "center",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: height * 0.02,
  },

  field: {
    flex: 1,
    marginRight: width * 0.02,
  },

  fieldLast: {
    flex: 1,
    marginRight: 0,
  },

  fullField: {
    width: "100%",
    marginBottom: height * 0.02,
  },

  label: {
    color: "black",
    marginBottom: height * 0.005,
  },

  input: {
    borderWidth: 2,
    borderColor: "#c7da30",
    borderRadius: 8,
    padding: width * 0.02,
    fontSize: width * 0.04,
    backgroundColor: "#fff",
  },

  pickerWrapper: {
    borderWidth: 2,
    borderColor: "#c7da30",
    borderRadius: 8,
    overflow: "hidden",
  },

  descriptionInput: {
    height: height * 0.12,
    textAlignVertical: "top",
  },

  fileInput: {
    borderWidth: 2,
    borderColor: "#c7da30",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.03,
    justifyContent: "center",
  },

  fileInputText: {
    color: "#555",
    fontWeight: "500",
  },

  submitButton: {
    backgroundColor: "#fff",
    paddingVertical: height * 0.018,
    borderRadius: 50,
    alignItems: "center",
    width: "100%",
    marginTop: height * 0.015,
    borderWidth: 2,
    borderColor: "#c7da30",
  },

  submitText: {
    color: "#1aaed3ff",
    fontSize: width * 0.045,
    fontWeight: "bold",
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    backgroundColor: "#fff",
    padding: width * 0.08,
    borderRadius: 12,
    alignItems: "center",
    width: "85%",
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

  modalButtonText: {
    color: "#1aaed3ff",
    fontWeight: "500",
    fontSize: 16,
    fontFamily: "Montserrat",
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 5,
  },

  filePickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#c7da30",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    height: height * 0.06,
    marginBottom: height * 0.01,
  },

  chooseFileButton: {
    backgroundColor: "#d3d3d3",
    paddingHorizontal: width * 0.04,
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
    paddingHorizontal: width * 0.03,
    color: "#555",
    fontFamily: "Montserrat",
  },

  imagePreview: {
    width: "100%",
    height: height * 0.15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#c7da30",
    marginTop: height * 0.005,
  },

  videoPreview: {
    width: "100%",
    height: height * 0.23,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#c7da30",
  },

  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },

  loadingContainer: {
    backgroundColor: "#fff",
    padding: width * 0.08,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },

  loadingText: {
    marginTop: height * 0.015,
    fontSize: width * 0.045,
    fontWeight: "bold",
    color: "black",
    fontFamily: "Montserrat",
  },

  activeItem: {
    backgroundColor: "#87CEEB",
    borderRadius: 25,
  },

  errorText: {
    color: "red",
    fontSize: width * 0.035,
    marginTop: height * 0.003,
    fontFamily: "Montserrat",
  },
});