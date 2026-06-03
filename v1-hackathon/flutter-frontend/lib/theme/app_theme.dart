import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get dark {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.base,
      colorScheme: const ColorScheme.dark(
        surface: AppColors.base,
        primary: AppColors.queuePurple,
        secondary: AppColors.alienGreen,
        onSurface: AppColors.ink,
      ),
      textTheme: _textTheme,
      useMaterial3: true,
    );
  }

  static TextTheme get _textTheme {
    return TextTheme(
      // Display — Instrument Serif
      displayLarge: GoogleFonts.instrumentSerif(
        fontSize: 22,
        color: AppColors.ink,
        height: 1.2,
      ),
      displayMedium: GoogleFonts.instrumentSerif(
        fontSize: 18,
        color: AppColors.ink,
        height: 1.2,
      ),
      displaySmall: GoogleFonts.instrumentSerif(
        fontSize: 14,
        fontStyle: FontStyle.italic,
        color: AppColors.ink,
        height: 1.2,
      ),
      // Labels — JetBrains Mono
      labelLarge: GoogleFonts.jetBrainsMono(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: AppColors.ink,
        letterSpacing: 1.2,
      ),
      labelMedium: GoogleFonts.jetBrainsMono(
        fontSize: 10,
        fontWeight: FontWeight.w500,
        color: AppColors.inkSoft,
        letterSpacing: 1.4,
      ),
      labelSmall: GoogleFonts.jetBrainsMono(
        fontSize: 8,
        fontWeight: FontWeight.w400,
        color: AppColors.inkDim,
        letterSpacing: 1.6,
      ),
      // Body — Inter
      bodyLarge: GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: AppColors.ink,
        height: 1.5,
      ),
      bodyMedium: GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: AppColors.inkSoft,
        height: 1.4,
      ),
      bodySmall: GoogleFonts.inter(
        fontSize: 10,
        fontWeight: FontWeight.w400,
        color: AppColors.inkDim,
        height: 1.4,
      ),
    );
  }
}
