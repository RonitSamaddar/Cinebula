import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../models/show_model.dart';
import '../theme/app_colors.dart';

/// A poster card for a show on the galaxy canvas.
class ShowCard extends StatelessWidget {
  final Show show;
  final Color accentColor;
  final VoidCallback? onTap;

  const ShowCard({
    super.key,
    required this.show,
    required this.accentColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final w = show.cardWidth;
    final h = show.cardHeight;
    final fontSize = show.sizeTier == ShowSize.extraSmall ? 7.0 : 9.0;
    final titleFontSize = show.sizeTier == ShowSize.extraSmall ? 6.0 : 8.0;
    final borderRadius = show.sizeTier == ShowSize.extraSmall ? 4.0 : 8.0;

    return RepaintBoundary(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(
          width: w,
          height: h + 14,
          child: Column(
            children: [
              Container(
                width: w,
                height: h,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(borderRadius),
                  border: Border.all(
                    color: accentColor.withValues(alpha: 0.3),
                    width: 0.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: accentColor.withValues(alpha: 0.15),
                      blurRadius: 12,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(borderRadius),
                  child: CachedNetworkImage(
                    imageUrl: show.posterUrl,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => _buildFallback(w, h, fontSize),
                    errorWidget: (context, url, error) => _buildFallback(w, h, fontSize),
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                show.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.inkSoft,
                  fontSize: titleFontSize,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFallback(double w, double h, double fontSize) {
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
            fontSize: fontSize,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
