import {
  Montserrat_400Regular,
  Montserrat_700Bold,
  useFonts,
} from "@expo-google-fonts/montserrat";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";

export default function RootLayout() {
  // 🔥 TOP-LEVEL RENDER LOG
  console.log("🟢 [_layout] RootLayout rendered");

  // 🔤 FONT LOADING
  const [fontsLoaded] = useFonts({
    Montserrat: Montserrat_400Regular,
    MontserratBold: Montserrat_700Bold,
  });

  console.log("🟡 [_layout] fontsLoaded =", fontsLoaded);

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
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}