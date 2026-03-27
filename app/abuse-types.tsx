import MenuToggle from "@/components/menuToggle";
import TopBar from "@/components/toBar";
import { BACKEND_URL } from "@/utils/config";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function AbuseTypesScreen() {
    const [abuseTypes, setAbuseTypes] = useState<any[]>([]);
    const [menuVisible, setMenuVisible] = useState(false);
    const slideAnim = useState(new Animated.Value(width))[0];

    const router = useRouter();
   

    const params = useLocalSearchParams();
    const anonymous = params.anonymous;
    const editMode = params.editMode;
    const caseNumber = params.caseNumber;


    useEffect(() => {
        axios
            .get(`${BACKEND_URL}/abuse_types`)
            .then((res) => setAbuseTypes(res.data))
            .catch((err) => {
                console.error("Error fetching abuse types:", err);
                Alert.alert("Failed to load abuse types. Please try again.");
            });
    }, []);

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

  const handleAbuseTypeSelect = (type: any) => {
    if (editMode === "true") {
        router.push({
            pathname: "/edit-report",
            params: {
                case_number: caseNumber,
                newAbuseTypeId: type.id,
                newAbuseTypeName: type.type_name,
            },
        });
    } else {
        router.push({
            pathname: "/report-form",
            params: {
                abuseTypeId: type.id,
                abuseTypeName: type.type_name,
                anonymous,
            },
        });
    }
};

    return (
        <View style={styles.container}>
            <TopBar
                menuVisible={menuVisible}
                onBack={() => router.back()}
                onToggleMenu={toggleMenu}
            />

            {abuseTypes.length === 0 ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator
                        size="large"
                        color="#c7da30"
                        style={{ transform: [{ scale: 1.5 }] }}
                    />
                </View>
            ) : (
                <View style={styles.centeredContent}>
                    <Text style={styles.title}>TYPES OF REPORT</Text>

                    {anonymous === "yes" && (
                        <Text style={styles.anonymousText}>You are reporting anonymously</Text>
                    )}
                    {anonymous === "no" && (
                        <Text style={styles.anonymousText}>You are reporting with details</Text>
                    )}

                    <View style={styles.abuseBox}>
                        <View style={styles.abuseGrid}>
                            {abuseTypes.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={styles.abuseButton}
                                    onPress={() => handleAbuseTypeSelect(type)}
                                >
                                    <Text style={styles.abuseText}>{type.type_name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            )}

            {menuVisible && <TouchableOpacity style={styles.overlay} onPress={toggleMenu} />}

            <MenuToggle
              menuVisible={menuVisible}
              slideAnim={slideAnim}
              onNavigate={handleNavigate}
              onBack={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.push("/report-screen"); // Go home if no back screen
                }
              }}
              onClose={() => setMenuVisible(false)}
            />
 
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        paddingHorizontal: width * 0.05,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    centeredContent: {
        flex: 1,
        justifyContent: "center",
    },
    title: {
        fontSize: width * 0.055,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: height * 0.015,
        color: "#000",
        fontFamily: 'Montserrat'
    },
    anonymousText: {
        textAlign: "center",
        color: "black",
        marginBottom: height * 0.02,
        fontWeight: "bold",
        fontSize: width * 0.04,
        fontFamily: 'Montserrat'
    },
    abuseBox: {
        borderColor: "#c7da30",
        borderWidth: 2,
        padding: width * 0.05,
        borderRadius: 12,
    },
    abuseGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    abuseButton: {
        backgroundColor: "#fff",
        borderColor: "#c7da30",
        borderWidth: 2,
        borderRadius: width * 0.06,
        width: "48%",
        height: height * 0.07, 
        justifyContent: "center",
        alignItems: "center",
        marginBottom: height * 0.02,
        paddingHorizontal: width * 0.02,
    },
    abuseText: {
        color: "#1aaed3ff",
        fontWeight: "bold",
        fontSize: width * 0.035,
        textAlign: "center",
        flexShrink: 1,
        fontFamily: 'Montserrat'

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
});
