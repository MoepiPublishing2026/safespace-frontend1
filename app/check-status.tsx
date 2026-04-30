import MenuToggle from "@/components/menuToggle";
import TopBar from "@/components/toBar";
import { BACKEND_URL } from "@/utils/config";
import axios from "axios";
import { Audio, ResizeMode, Video } from "expo-av";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
const { width } = Dimensions.get("window");

export default function DetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const anonymous = params.anonymous;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(width))[0];

  // 🎵 AUDIO STATE
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const stopAndUnloadAudio = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch { }
      soundRef.current = null;
      setIsPlaying(false);
      setDuration(0);
      setPosition(0);
    }
  };

  // Stop when leaving screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        stopAndUnloadAudio();
      };
    }, [])
  );

  // Stop on component unmount
  useEffect(() => {
    return () => {
      stopAndUnloadAudio();
    };
  }, []);

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const togglePlay = async (uri: string) => {
    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true }
        );

        soundRef.current = sound;
        setIsPlaying(true);

        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);
          }
        });
      } else {
        const status = await soundRef.current.getStatusAsync();
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.log("Audio error:", err);
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
    setTimeout(() => {
      router.push({ pathname: path as any });
    }, 250);
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.trim().toLowerCase();
    switch (normalizedStatus) {
      case "awaiting-resolution":
        return "#EF4444";
      case "forwarded":
        return "#FACC15";
      case "under-review":
        return "#3B82F6";
      case "closed":
        return "#22C55E";
      case "unresolved":
        return "#FB923C";
      case "false-report":
        return "#9CA3AF";
      default:
        return "#E5E7EB";
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please fill out this field");
      return;
    }

    // 🔥 Stop audio before new search
    await stopAndUnloadAudio();

    setLoading(true);
    setError("");
    setSearchResult(null);

    try {
      const res = await axios.get(`${BACKEND_URL}/reports/case/${searchQuery}`);

      if (res.data?.message?.toLowerCase().includes("malicious")) {
        router.push("/access-denied");
        return;
      }

      setSearchResult(res.data);
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message?.toLowerCase() || "";

      if (status === 404 || message.includes("not found")) {
        setError("Case not found");
      } else if (
        status === 403 ||
        message.includes("malicious") ||
        message.includes("forbidden")
      ) {
        router.push("/access-denied");
      } else {
        setError("Failed to fetch case. Check backend/network.");
      }
    } finally {
      setLoading(false);
    }
  };
  const renderField = (label: string, value: any) => {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return null;
    }

    return (
      <Text style={styles.detail}>
        <Text style={styles.detailLabel}>{label}: </Text>
        {value}
      </Text>
    );
  };
  return (
    <View style={styles.container}>
      <TopBar
        menuVisible={menuVisible}
        onBack={() => router.back()}
        onToggleMenu={toggleMenu}
      />

      {anonymous === "yes" && (
        <Text style={styles.anonymousText}>
          You’re reporting anonymously
        </Text>
      )}

      <Text style={styles.title}>TRACK STATUS</Text>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="CASE NUMBER"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {error && <Text style={{ color: "red",marginBottom:10 ,textAlign:"center"}}>{error}</Text>}

        <TouchableOpacity style={styles.statusButton} onPress={handleSearch}>
          <Text style={styles.statusButtonText}>Search</Text>
        </TouchableOpacity>

        <Text style={styles.caseStatusLabel}>YOUR CASE STATUS</Text>

        {loading && (
          <ActivityIndicator size="small" color="#c7da30" style={{ marginTop: 10 }} />
        )}



        {searchResult && (
          <ScrollView style={styles.statusContainer}>
            <View style={styles.caseItem}>
              <Text style={styles.caseNumber}>
                {String(searchResult.case_number || "")}
              </Text>

              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>Status: </Text>
                <Text
                  style={{
                    backgroundColor: getStatusColor(String(searchResult.status || "")),
                    color: "black",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: "Montserrat-Regular",
                  }}
                >
                  {String(searchResult.status || "")}
                </Text>
              </Text>

              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>Submitted: </Text>
                {new Date(searchResult.created_at || "").toLocaleDateString()}
              </Text>

              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>Abuse Type: </Text>
                {searchResult.abuse_type || ""}
              </Text>

              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>Subtype: </Text>
                {searchResult.subtype || ""}
              </Text>

              {searchResult.description &&
                searchResult.description.trim() !== "" && (
                  <Text style={styles.detail}>
                    <Text style={styles.detailLabel}>Description: </Text>
                    {searchResult.description}
                  </Text>
                )}

              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>Email: </Text>
                {String(searchResult.reporter_email || "")}
              </Text>

              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>Phone: </Text>
                {String(searchResult.phone_number || "")}
              </Text>

              {searchResult.full_name && (
                <Text style={styles.detail}>
                  <Text style={styles.detailLabel}>Full Name: </Text>
                  {searchResult.full_name}
                </Text>
              )}

              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>Age: </Text>
                {String(searchResult.age || "")}
              </Text>

              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>Grade: </Text>
                {String(searchResult.grade || "")}
              </Text>

              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>Location: </Text>
                {String(searchResult.location || "")}
              </Text>

              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>School: </Text>
                {String(searchResult.school_name || "")}
              </Text>

              {searchResult.latest_status_reason && (
                <Text style={styles.detail}>
                  <Text style={styles.detailLabel}>Reason: </Text>
                  {searchResult.latest_status_reason}
                </Text>
              )}

              {/* MEDIA SECTION */}
              {searchResult.image_path && (() => {
                let files: string[] = [];

                try {
                  files = JSON.parse(searchResult.image_path);
                } catch {
                  files = [searchResult.image_path];
                }

                return files.map((path: string, index: number) => {
                  const fileUrl = path.startsWith("http")
                    ? path
                    : `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;

                  const lowerPath = path.toLowerCase();

                  const isVideo =
                    lowerPath.endsWith(".mp4") ||
                    lowerPath.endsWith(".mov") ||
                    lowerPath.endsWith(".m4v");

                  const isAudio =
                    lowerPath.endsWith(".mp3") ||
                    lowerPath.endsWith(".wav") ||
                    lowerPath.endsWith(".aac") ||
                    lowerPath.endsWith(".m4a");

                  if (isVideo) {
                    return (
                      <Video
                        key={index}
                        source={{ uri: fileUrl }}
                        style={styles.reporterVideo}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                      />
                    );
                  }

                  if (isAudio) {
                    return (
                      <View key={index} style={{ marginTop: 10 }}>
                        <Text style={{ marginBottom: 5 }}>Audio Attachment:</Text>

                        <TouchableOpacity
                          style={styles.playButton}
                          onPress={() => togglePlay(fileUrl)}
                        >
                          <Text style={styles.playButtonText}>
                            {isPlaying ? "⏸" : "▶"}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: duration
                                  ? `${(position / duration) * 100}%`
                                  : "0%",
                              },
                            ]}
                          />
                        </View>

                        <Text style={styles.timeText}>
                          {formatTime(position)} / {formatTime(duration)}
                        </Text>
                      </View>
                    );
                  }

                  return (
                    <Image
                      key={index}
                      source={{ uri: fileUrl }}
                      style={styles.reporterImage}
                      resizeMode="cover"
                      onError={(e: { nativeEvent: { error: any; }; }) =>
                        console.log("Image load error:", e.nativeEvent?.error)
                      }
                    />
                  );
                });
              })()}


              <TouchableOpacity
                style={styles.editButton}
                onPress={() =>
                  router.push({
                    pathname: "/edit-report",
                    params: { case_number: searchResult.case_number },
                  })
                }
              >
                <Text style={styles.editButtonText}>Edit Report</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {menuVisible && (
        <TouchableOpacity style={styles.overlay} onPress={toggleMenu} />
      )}

      <MenuToggle
        menuVisible={menuVisible}
        slideAnim={slideAnim}
        onNavigate={handleNavigate}
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.push("/");
        }}
        onClose={() => setMenuVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 20 },
  anonymousText: { textAlign: "center", color: "black", marginBottom: 10, fontFamily: "Montserrat" },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginVertical: 10, fontFamily: "Montserrat" },
  formContainer: { width: "100%", borderWidth: 2, borderColor: "#c7da30", borderRadius: 10, padding: 20, backgroundColor: "#fff" },
  input: { width: "100%", height: 50, borderWidth: 2, borderColor: "#c7da30", borderRadius: 8, paddingHorizontal: 15, fontSize: 16, marginBottom: 10, fontFamily: "Montserrat" },
  statusButton: { backgroundColor: "#fff", width: "100%", padding: 10, borderRadius: 48, justifyContent: "center", alignItems: "center", marginBottom: 10, borderColor: "#c7da30", borderWidth: 2 },
  statusButtonText: { color: "#1aaed3ff", fontWeight: "bold", fontSize: 16 },
  caseStatusLabel: { fontSize: 16, fontWeight: "bold", marginVertical: 10, textAlign: "center", fontFamily: "Montserrat" },
  statusContainer: { width: "100%", maxHeight: 300, marginTop: 10, flexGrow: 0 },
  caseItem: { backgroundColor: "#f9f9f9", padding: 15, borderRadius: 8, borderWidth: 1, borderColor: "#eee", marginBottom: 10 },
  caseNumber: { fontSize: 16, fontWeight: "bold", fontFamily: "Montserrat" },
  detail: { fontSize: 14, color: "#333", marginBottom: 3, fontFamily: "Montserrat" },
  detailLabel: { fontWeight: "bold", fontFamily: "Montserrat" },
  editButton: { marginTop: 15, borderWidth: 2, borderColor: "#c7da30", padding: 12, borderRadius: 50, alignItems: "center" },
  editButtonText: { color: "#1aaed3ff", fontWeight: "bold", fontSize: 16 },
  reporterImage: { width: 300, height: 200, marginBottom: 10 },
  reporterVideo: { width: 300, height: 200, marginBottom: 10 },
  overlay: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.3)", zIndex: 5 },

  playButton: {
    backgroundColor: "#c7da30",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  playButtonText: { fontSize: 20, fontWeight: "bold" },
  progressBar: { width: "100%", height: 6, backgroundColor: "#eee", borderRadius: 3, overflow: "hidden", marginBottom: 5 },
  progressFill: { height: "100%", backgroundColor: "#1aaed3ff" },
  timeText: { fontSize: 12, color: "#333", textAlign: "center" },
});
