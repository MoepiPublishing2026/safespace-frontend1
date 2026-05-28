import MenuToggle from "@/components/menuToggle";
import TopBar from "@/components/toBar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function ReportCaseScreen() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(width))[0];

  const handleSelect = (choice: string) => {
    router.push({
      pathname: "/abuse-types",
      params: { anonymous: choice },
    });
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

  return (
    <View style={styles.container}>
      {/* Top bar: logo and menu icon */}
      <View style = {{marginTop:-45 }}>
       <TopBar
             menuVisible={menuVisible}
             onBack={() => router.back()}
             onToggleMenu={toggleMenu}
        />
      </View>  

      {/* Centered content */}
      <View style={[styles.centerContent , { marginTop: -100 }]}> 
        <Text style={styles.questionText}>REPORT ANONYMOUSLY?</Text>

        <View style={styles.conditionBox}>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={() => handleSelect("yes")}>
              <LinearGradient
                colors={["#FFFFFF", "#FFFFFF"]}
                style={styles.gradientButton}
                start={[0, 0]}
                end={[1, 1]}
              >
                <Text style={styles.choiceText}>Yes</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleSelect("no")}>
              <LinearGradient
                colors={["#FFFFFF", "#FFFFFF"]}
                style={styles.gradientButton}
                start={[0, 0]}
                end={[1, 1]}
              >
                <Text style={styles.choiceText}>No</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
                  router.push("/"); 
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
    paddingHorizontal: width * 0.05, // scales with screen
    
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  questionText: {
    fontSize: width * 0.06, // scales with screen width
    fontWeight: "bold",
    marginBottom: height * 0.05,
    textAlign: "center",
    color: "#000",
    fontFamily: 'Montserrat'
  },
  conditionBox: {
    borderColor: '#c7da30',
    borderWidth: 2,
    padding: width * 0.05,
    borderRadius: width * 0.02,
  },
  buttonRow: {
    flexDirection: "row",
    gap: width * 0.08, 
    justifyContent: "center",
  },
  gradientButton: {
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.08,
    borderRadius: 255,
    minWidth: width * 0.25, 
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#c7da30",
  },
  choiceText: {
    color: "#1aaed3ff",
    fontSize: width * 0.040, 
    fontWeight: "bold",
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