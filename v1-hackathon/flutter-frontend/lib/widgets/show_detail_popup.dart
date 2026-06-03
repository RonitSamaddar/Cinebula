import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../models/show_model.dart';
import '../theme/app_colors.dart';

/// Bottom sheet detail popup for a show.
void showDetailPopup(BuildContext context, Show show, Color accentColor) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (_) => _ShowDetailSheet(show: show, accentColor: accentColor),
  );
}

class _ShowDetailSheet extends StatelessWidget {
  final Show show;
  final Color accentColor;

  const _ShowDetailSheet({required this.show, required this.accentColor});

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.55,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFF0E0C18),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: accentColor.withValues(alpha: 0.3)),
          left: BorderSide(color: accentColor.withValues(alpha: 0.15)),
          right: BorderSide(color: accentColor.withValues(alpha: 0.15)),
        ),
        boxShadow: [
          BoxShadow(
            color: accentColor.withValues(alpha: 0.15),
            blurRadius: 40,
            offset: const Offset(0, -10),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 8),
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.inkDim,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          Flexible(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 16 + bottomPad),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Poster + title row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Poster
                      Container(
                        width: 100,
                        height: 150,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: accentColor.withValues(alpha: 0.3),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: accentColor.withValues(alpha: 0.2),
                              blurRadius: 16,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: CachedNetworkImage(
                            imageUrl: show.posterUrl,
                            fit: BoxFit.cover,
                            errorWidget: (_, __, ___) => _posterFallback(),
                            placeholder: (_, __) => _posterFallback(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),

                      // Title + meta
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text(
                              show.title,
                              style: const TextStyle(
                                fontFamily: 'Instrument Serif',
                                fontSize: 22,
                                fontWeight: FontWeight.w400,
                                color: AppColors.ink,
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 8),
                            // Year + rating + language
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                _metaChip('${show.year}'),
                                _metaChip('★ ${show.rating.toStringAsFixed(1)}'),
                                _metaChip(show.language),
                              ],
                            ),
                            const SizedBox(height: 10),
                            // Match %
                            if (show.matchPercent > 0)
                              Text(
                                '${show.matchPercent}% match',
                                style: TextStyle(
                                  fontFamily: 'JetBrains Mono',
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: accentColor,
                                  letterSpacing: 0.5,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Genre tags
                  if (show.genres.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: show.genres.map((g) => _genreTag(g)).toList(),
                    ),
                  ],

                  // Description
                  if (show.description.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      show.description,
                      style: const TextStyle(
                        color: AppColors.inkSoft,
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                  ],

                  // Actors
                  if (show.actors.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      'CAST',
                      style: TextStyle(
                        fontFamily: 'JetBrains Mono',
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppColors.inkDim,
                        letterSpacing: 2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      show.actors.join(' · '),
                      style: const TextStyle(
                        color: AppColors.inkSoft,
                        fontSize: 12,
                        height: 1.4,
                      ),
                    ),
                  ],

                  // Action buttons
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: _ActionButton(
                          icon: show.isQueued ? Icons.bookmark : Icons.bookmark_border,
                          label: show.isQueued ? 'QUEUED' : 'QUEUE',
                          color: show.isQueued ? AppColors.queuePurple : AppColors.inkSoft,
                          onTap: () {},
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _ActionButton(
                          icon: show.isWatched ? Icons.visibility : Icons.visibility_outlined,
                          label: show.isWatched ? 'WATCHED' : 'WATCHED?',
                          color: show.isWatched ? AppColors.alienGreen : AppColors.inkSoft,
                          onTap: () {},
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _posterFallback() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            accentColor.withValues(alpha: 0.3),
            AppColors.base,
          ],
        ),
      ),
      child: Center(
        child: Text(
          show.title.substring(0, show.title.length.clamp(0, 2)).toUpperCase(),
          style: TextStyle(
            color: accentColor,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _metaChip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.glassBg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontFamily: 'JetBrains Mono',
          fontSize: 10,
          color: AppColors.inkSoft,
        ),
      ),
    );
  }

  Widget _genreTag(String genre) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: accentColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accentColor.withValues(alpha: 0.2)),
      ),
      child: Text(
        genre.toUpperCase(),
        style: TextStyle(
          fontFamily: 'JetBrains Mono',
          fontSize: 9,
          fontWeight: FontWeight.w500,
          color: accentColor.withValues(alpha: 0.8),
          letterSpacing: 1,
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: color,
                letterSpacing: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
