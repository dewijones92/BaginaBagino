import 'package:flutter/material.dart';
import 'tokens.dart';

ThemeData buildBaginaTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: BaginaPalette.pinkDeep,
    brightness: Brightness.light,
    surface: BaginaPalette.cream,
    primary: BaginaPalette.pinkDeep,
    secondary: BaginaPalette.lavenderDeep,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: BaginaPalette.cream,
    visualDensity: VisualDensity.adaptivePlatformDensity,
    textTheme: TextTheme(
      displayLarge: BaginaTypeScale.display.copyWith(color: BaginaPalette.ink),
      titleLarge: BaginaTypeScale.title.copyWith(color: BaginaPalette.ink),
      bodyMedium: BaginaTypeScale.body.copyWith(color: BaginaPalette.ink),
      labelMedium: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink),
    ),
    cardTheme: CardThemeData(
      color: BaginaPalette.creamWarm,
      elevation: BaginaElevation.card,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(BaginaRadii.large)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: BaginaPalette.creamWarm,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(BaginaRadii.large),
        borderSide: BorderSide(color: BaginaPalette.creamDeep),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(BaginaRadii.large),
        borderSide: BorderSide(color: BaginaPalette.creamDeep),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(BaginaRadii.large),
        borderSide: BorderSide(color: BaginaPalette.pinkDeep, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(BaginaRadii.pill)),
        backgroundColor: BaginaPalette.pinkDeep,
        foregroundColor: Colors.white,
        textStyle: BaginaTypeScale.body.copyWith(fontWeight: FontWeight.w800),
      ),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: BaginaPalette.cream,
      foregroundColor: BaginaPalette.ink,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: BaginaTypeScale.title.copyWith(color: BaginaPalette.ink),
    ),
  );
}
