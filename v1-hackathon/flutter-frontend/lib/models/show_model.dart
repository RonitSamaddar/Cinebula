enum ShowSize { large, medium, small, extraSmall }

class Show {
  final String id;
  final String title;
  final String posterUrl;
  final List<String> genres;
  final String categoryKey;
  final int year;
  final double rating;
  final String language;
  final String description;
  final List<String> actors;
  final List<String> tags;
  final double relativeX; // offset from category center in px
  final double relativeY; // offset from category center in px
  final int matchPercent; // 0–100 recommendation score
  final ShowSize sizeTier;
  bool isQueued;
  bool isWatched;

  Show({
    required this.id,
    required this.title,
    required this.posterUrl,
    required this.genres,
    required this.categoryKey,
    required this.year,
    required this.rating,
    this.language = 'English',
    this.description = '',
    this.actors = const [],
    this.tags = const [],
    required this.relativeX,
    required this.relativeY,
    this.matchPercent = 0,
    this.sizeTier = ShowSize.small,
    this.isQueued = false,
    this.isWatched = false,
  });

  double get cardWidth {
    switch (sizeTier) {
      case ShowSize.large: return 90;
      case ShowSize.medium: return 70;
      case ShowSize.small: return 50;
      case ShowSize.extraSmall: return 36;
    }
  }

  double get cardHeight => cardWidth * 1.5;
}
