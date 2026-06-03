import 'dart:ui';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/mock_api.dart';
import '../models/category_model.dart';
import '../models/show_model.dart';

/// Holds all galaxy state: categories, shows, visibility, loading status.
class GalaxyState {
  final List<Category> categories;
  final Map<String, List<Show>> showsByCategory;
  final int visiblePerCategory;
  final bool isLoading;

  const GalaxyState({
    this.categories = const [],
    this.showsByCategory = const {},
    this.visiblePerCategory = kInitialVisibleShows,
    this.isLoading = true,
  });

  GalaxyState copyWith({
    List<Category>? categories,
    Map<String, List<Show>>? showsByCategory,
    int? visiblePerCategory,
    bool? isLoading,
  }) {
    return GalaxyState(
      categories: categories ?? this.categories,
      showsByCategory: showsByCategory ?? this.showsByCategory,
      visiblePerCategory: visiblePerCategory ?? this.visiblePerCategory,
      isLoading: isLoading ?? this.isLoading,
    );
  }

  /// Returns currently visible shows with their absolute world positions.
  List<(Show, Offset)> get visibleShowsWithPositions {
    final result = <(Show, Offset)>[];
    for (final cat in categories) {
      final shows = showsByCategory[cat.key] ?? [];
      final count = visiblePerCategory.clamp(0, shows.length);
      for (var i = 0; i < count; i++) {
        final show = shows[i];
        // relativeX/Y are already px offsets from category center
        final worldPos = cat.position + Offset(show.relativeX, show.relativeY);
        result.add((show, worldPos));
      }
    }
    return result;
  }
}

class GalaxyNotifier extends StateNotifier<GalaxyState> {
  GalaxyNotifier() : super(const GalaxyState()) {
    _init();
  }

  Future<void> _init() async {
    final categories = await fetchCategories();

    final showsByCategory = <String, List<Show>>{};
    for (final cat in categories) {
      showsByCategory[cat.key] = await fetchShowsByCategory(cat.key);
    }

    state = state.copyWith(
      categories: categories,
      showsByCategory: showsByCategory,
      isLoading: false,
    );
  }

  /// Reveal more shows (e.g. on zoom in).
  void revealMore() {
    state = state.copyWith(
      visiblePerCategory: (state.visiblePerCategory + 10)
          .clamp(0, kShowsPerCategory),
    );
  }

  /// Reset to initial visible count.
  void resetVisibility() {
    state = state.copyWith(visiblePerCategory: kInitialVisibleShows);
  }
}

final galaxyProvider =
    StateNotifierProvider<GalaxyNotifier, GalaxyState>((ref) {
  return GalaxyNotifier();
});
