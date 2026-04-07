import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity
} from "react-native";

const { width, height } = Dimensions.get("window");

interface MenuToggleProps {
  menuVisible: boolean;
  slideAnim: Animated.Value;
  onNavigate: (path: string) => void;
  onBack: () => void;
  onClose: () => void;
}

export default function MenuToggle({ menuVisible, slideAnim, onNavigate, onBack, onClose }: MenuToggleProps) {
  if (!menuVisible) return null;

  return (
    <Animated.View
      style={[styles.menu, { transform: [{ translateX: slideAnim }] }]}
    >
      <SafeAreaView style={styles.menuContent}>
        {/* Close button */}
        <TouchableOpacity onPress={onClose} style={styles.menuItem}>
          <Ionicons name="close" size={width * 0.12} color="#c7da30" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate("/")} style={styles.menuItem}>
          <Text style={styles.menuText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate("/report-screen")} style={styles.menuItem}>
          <Text style={styles.menuText}>Report</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate("/check-status")} style={styles.menuItem}>
          <Text style={styles.menuText}>Check status</Text>
        </TouchableOpacity>

        {/* Back button */}

        <TouchableOpacity
          onPress={() => {
            onClose(); // Close menu first
            setTimeout(() => onBack(), 250); // Then go back after menu animation
          }}
          style={styles.menuItem}
        >
          <Text style={styles.menuText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    top: 0,
    right: 0,
    width: width * 0.7,
    height: "100%",
    backgroundColor: "#FFFFFF",
    zIndex: 10,
    shadowColor: "black",
  shadowOffset: { width: -5, height: 0 }, // negative X = shadow on the left
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 50,
  },
  menuContent: {
    marginTop: height * 0.06,
    paddingHorizontal: width * 0.05,
  },
  menuItem: {
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.03,
    borderBottomWidth: 1,
    borderBottomColor: "#fff",
    borderRadius: 25,
    marginBottom: height * 0.015,
  },
  menuText: {
    textAlign: "left",
    fontSize: width * 0.04,
    color: "#1aaed3ff",
    fontWeight: "600",
    
  },
});

  