import 'package:flutter/material.dart';

import '../wire/wire.dart';
import 'tokens.dart';

/// One central mapping from the PlayerColor wire enum to actual paint.
/// Use `.swatch` for the base shade (badges, chips, fills) and `.deep` for
/// emphasis tones (player tokens, focused borders, accent strokes).
///
/// If you find yourself writing a `switch (player.color)` to pick a Color
/// in a widget, stop and add it here instead.
extension PlayerColorX on PlayerColor {
  Color get swatch {
    switch (this) {
      case PlayerColor.pink: return BaginaPalette.pink;
      case PlayerColor.mint: return BaginaPalette.mint;
      case PlayerColor.lavender: return BaginaPalette.lavender;
      case PlayerColor.butter: return BaginaPalette.butter;
    }
  }

  Color get deep {
    switch (this) {
      case PlayerColor.pink: return BaginaPalette.pinkDeep;
      case PlayerColor.mint: return BaginaPalette.mintDeep;
      case PlayerColor.lavender: return BaginaPalette.lavenderDeep;
      case PlayerColor.butter: return BaginaPalette.butterDeep;
    }
  }
}
