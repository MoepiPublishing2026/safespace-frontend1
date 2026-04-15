import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  useFonts,
} from "@expo-google-fonts/montserrat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function RootLayout() {
  // 🔥 TOP-LEVEL RENDER LOG
  console.log("🟢 [_layout] RootLayout rendered");

  const [showCookie, setShowCookie] = useState(false);

  // 🔤 FONT LOADING
  const [fontsLoaded] = useFonts({
    Montserrat: Montserrat_400Regular,
    MontserratBold: Montserrat_700Bold,
  });

  console.log("🟡 [_layout] fontsLoaded =", fontsLoaded);

  // 🍪 COOKIE MODAL EFFECT
  useEffect(() => {
    console.log("🟣 [_layout] useEffect(showCookie) fired");

    setShowCookie(true);

    return () => {
      console.log("❌ [_layout] cleanup(showCookie effect)");
    };
  }, []);

  // 🧪 PLATFORM CHECK
  useEffect(() => {
    console.log("🧪 [_layout] Platform.OS =", Platform.OS);
  }, []);

  // ⛔ BLOCK RENDER UNTIL FONTS LOAD
  if (!fontsLoaded) {
    console.log("⏳ [_layout] Fonts not loaded yet — returning null");
    return null;
  }

  console.log("✅ [_layout] Fonts loaded — rendering app");

  return (
    <View style={{ flex: 1 }}>
      {/* 🧭 STACK NAVIGATOR */}
      <Stack
        screenOptions={{ headerShown: false }}
      />

      {/* 🍪 COOKIE MODAL */}
      <Modal
        visible={showCookie}
        transparent
        animationType="fade"
        onShow={() => console.log("📦 [_layout] Cookie modal SHOWN")}
        onDismiss={() => console.log("📦 [_layout] Cookie modal DISMISSED")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cookies Policy</Text>

            <Text style={styles.modalText}>
              We use essential cookies to keep Safe Space secure and working
              properly.
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={async () => {
                console.log("🍪 [_layout] Accept cookies pressed");
                try {
                  await AsyncStorage.setItem("cookieConsent", "all");
                  console.log("✅ [_layout] Cookies saved to AsyncStorage");
                } catch (err) {
                  console.error(
                    "❌ [_layout] Error saving cookies:",
                    err
                  );
                }
                setShowCookie(false);
              }}
            >
              <Text style={styles.modalButtonAccept}>Accept All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={async () => {
                console.log("🍪 [_layout] Reject cookies pressed");
                try {
                  await AsyncStorage.setItem(
                    "cookieConsent",
                    "rejected"
                  );
                  console.log("✅ [_layout] Rejection saved");
                } catch (err) {
                  console.error(
                    "❌ [_layout] Error rejecting cookies:",
                    err
                  );
                }
                setShowCookie(false);
              }}
            >
              <Text style={styles.modalButtonReject}>Reject All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#1aaed3ff",
    fontFamily: "Montserrat",
  },
  modalText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    color: "#444",
    fontFamily: "Montserrat",
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 50,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderColor: "#c7da30",
    borderWidth: 2,
  },
  modalButtonAccept: {
    color: "#1aaed3ff",
    textAlign: "center",
    fontSize: 15,
    fontFamily: "Montserrat",
  },
  modalButtonReject: {
    color: "red",
    textAlign: "center",
    fontSize: 15,
    fontFamily: "Montserrat",
  },
});