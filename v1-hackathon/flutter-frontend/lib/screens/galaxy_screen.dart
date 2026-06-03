import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../canvas/starfield_painter.dart';
import '../canvas/nebula_painter.dart';
import '../canvas/effects_painter.dart';
import '../canvas/film_grain_painter.dart';
import '../data/mock_api.dart';
import '../providers/galaxy_provider.dart';
import '../widgets/category_pill.dart';
import '../widgets/compass_label.dart';
import '../widgets/show_card.dart';
import '../widgets/show_detail_popup.dart';
import '../theme/app_colors.dart';

/// The main (and only) screen. For now: space background with all canvas layers.
class GalaxyScreen extends ConsumerStatefulWidget {
  const GalaxyScreen({super.key});

  @override
  ConsumerState<GalaxyScreen> createState() => _GalaxyScreenState();
}

class _GalaxyScreenState extends ConsumerState<GalaxyScreen>
    with TickerProviderStateMixin {
  // Camera position (simulated pan offset)
  double _cameraX = 0;
  double _cameraY = 0;

  // Momentum
  double _velX = 0;
  double _velY = 0;
  Offset _lastDragDelta = Offset.zero;
  DateTime _lastDragTime = DateTime.now();
  bool _hasDragged = false;

  // Fly-to animation
  AnimationController? _flyController;
  double _flyStartX = 0, _flyStartY = 0;
  double _flyEndX = 0, _flyEndY = 0;

  // Animation controllers
  late final AnimationController _breatheController;
  late final AnimationController _effectsController;
  late final AnimationController _grainController;

  // Background glow color (blended from category accents based on camera pos)
  Color _glowColor = AppColors.drama;

  @override
  void initState() {
    super.initState();

    // Star breathing: 12s cycle
    _breatheController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 12),
    )..repeat();

    // Effects: continuous ticker for 60fps
    _effectsController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat();

    // Film grain: slow refresh
    _grainController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    )..repeat();

    _breatheController.addListener(_onTick);
    _effectsController.addListener(_onTick);
  }

  void _onTick() {
    if (_velX.abs() > 0.1 || _velY.abs() > 0.1) {
      setState(() {
        _cameraX += _velX;
        _cameraY += _velY;
        _velX *= 0.95;
        _velY *= 0.95;
        _updateGlowColor();
      });
    }
  }

  void _handleTapAt(Offset tapPos, Size screenSize) {
    final galaxy = ref.read(galaxyProvider);
    if (galaxy.isLoading) return;

    final halfW = screenSize.width / 2;
    final halfH = screenSize.height / 2;

    // Check from largest cards to smallest for better UX
    for (final (show, worldPos) in galaxy.visibleShowsWithPositions) {
      var dx = worldPos.dx - _cameraX;
      var dy = worldPos.dy - _cameraY;
      if (dx > kWorldW / 2) dx -= kWorldW;
      if (dx < -kWorldW / 2) dx += kWorldW;
      if (dy > kWorldH / 2) dy -= kWorldH;
      if (dy < -kWorldH / 2) dy += kWorldH;

      final sx = dx + halfW;
      final sy = dy + halfH;

      final cardLeft = sx - show.cardWidth / 2;
      final cardTop = sy - show.cardHeight / 2;
      final cardRect = Rect.fromLTWH(cardLeft, cardTop, show.cardWidth, show.cardHeight + 14);

      if (cardRect.contains(tapPos)) {
        final cat = galaxy.categories.where((c) => c.key == show.categoryKey).firstOrNull;
        final accent = cat?.accentColor ?? AppColors.drama;
        showDetailPopup(context, show, accent);
        return;
      }
    }
  }

  void _flyToCategory(double targetX, double targetY) {
    _velX = 0;
    _velY = 0;
    _flyStartX = _cameraX;
    _flyStartY = _cameraY;

    // Compute shortest wrapped path
    var dx = targetX - _cameraX;
    var dy = targetY - _cameraY;
    if (dx > kWorldW / 2) dx -= kWorldW;
    if (dx < -kWorldW / 2) dx += kWorldW;
    if (dy > kWorldH / 2) dy -= kWorldH;
    if (dy < -kWorldH / 2) dy += kWorldH;
    _flyEndX = _cameraX + dx;
    _flyEndY = _cameraY + dy;

    _flyController?.dispose();
    _flyController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _flyController!.addListener(() {
      final t = Curves.easeInOutCubic.transform(_flyController!.value);
      setState(() {
        _cameraX = _flyStartX + (_flyEndX - _flyStartX) * t;
        _cameraY = _flyStartY + (_flyEndY - _flyStartY) * t;
        _updateGlowColor();
      });
    });
    _flyController!.forward();
    if (!_hasDragged) _hasDragged = true;
  }

  void _updateGlowColor() {
    final galaxy = ref.read(galaxyProvider);
    final cats = galaxy.categories;
    if (cats.isEmpty) return;

    double totalWeight = 0;
    double r = 0, g = 0, b = 0;

    for (final cat in cats) {
      var dx = _cameraX - cat.position.dx;
      var dy = _cameraY - cat.position.dy;
      // Wrap for shortest distance
      if (dx > kWorldW / 2) dx -= kWorldW;
      if (dx < -kWorldW / 2) dx += kWorldW;
      if (dy > kWorldH / 2) dy -= kWorldH;
      if (dy < -kWorldH / 2) dy += kWorldH;
      final dist = sqrt(dx * dx + dy * dy);
      final weight = 1.0 / (1.0 + dist * dist / 40000);
      totalWeight += weight;
      r += cat.accentColor.r * weight;
      g += cat.accentColor.g * weight;
      b += cat.accentColor.b * weight;
    }

    _glowColor = Color.from(
      alpha: 1.0,
      red: r / totalWeight,
      green: g / totalWeight,
      blue: b / totalWeight,
    );
  }

  @override
  void dispose() {
    _flyController?.dispose();
    _breatheController.dispose();
    _effectsController.dispose();
    _grainController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final parallax = Offset(-_cameraX, -_cameraY);
    final now = DateTime.now();
    final elapsed = now.millisecondsSinceEpoch / 1000.0;

    return Container(
      color: AppColors.base,
      child: SizedBox.expand(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapUp: (details) {
            _handleTapAt(details.localPosition, screenSize);
          },
          onPanStart: (_) {
            _velX = 0;
            _velY = 0;
          },
          onPanUpdate: (details) {
            setState(() {
              _cameraX -= details.delta.dx;
              _cameraY -= details.delta.dy;
              _lastDragDelta = details.delta;
              _lastDragTime = DateTime.now();
              if (!_hasDragged) _hasDragged = true;
              _updateGlowColor();
            });
          },
          onPanEnd: (details) {
            final dt = DateTime.now().difference(_lastDragTime).inMilliseconds;
            if (dt < 50) {
              _velX = -_lastDragDelta.dx * 0.8;
              _velY = -_lastDragDelta.dy * 0.8;
            }
          },
          child: Stack(
            clipBehavior: Clip.none,
            children: [
            // Layer 0: Starfield canvas
            AnimatedBuilder(
              animation: _breatheController,
              builder: (context, _) {
                return CustomPaint(
                  size: screenSize,
                  painter: StarfieldPainter(
                    breathePhase: _breatheController.value,
                    parallaxOffset: parallax,
                  ),
                );
              },
            ),

            // Layer 0: Nebula canvas
            RepaintBoundary(
              child: CustomPaint(
                size: screenSize,
                painter: NebulaPainter(
                  parallaxOffset: parallax,
                  cameraX: _cameraX,
                  cameraY: _cameraY,
                ),
              ),
            ),

            // Layer 1: Background glow — dual glow for richness
            Center(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 500),
                curve: Curves.easeOut,
                width: 500,
                height: 500,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: _glowColor.withValues(alpha: 0.25),
                      blurRadius: 120,
                      spreadRadius: 60,
                    ),
                    BoxShadow(
                      color: _glowColor.withValues(alpha: 0.15),
                      blurRadius: 200,
                      spreadRadius: 100,
                    ),
                  ],
                ),
              ),
            ),

            // Layer 1: Effects canvas (60fps)
            AnimatedBuilder(
              animation: _effectsController,
              builder: (context, _) {
                return CustomPaint(
                  size: screenSize,
                  painter: EffectsPainter(
                    time: elapsed,
                    screenSize: screenSize,
                  ),
                );
              },
            ),

            // Layer 2: Show cards
            ..._buildShowCards(screenSize),

            // Layer 50: Film grain overlay
            IgnorePointer(
              child: AnimatedBuilder(
                animation: _grainController,
                builder: (context, _) {
                  return CustomPaint(
                    size: screenSize,
                    painter: FilmGrainPainter(
                      seed: (elapsed * 5).toInt(),
                    ),
                  );
                },
              ),
            ),

            // "DRAG TO EXPLORE" hint
            _buildPanHint(),

            // Compass labels (edge navigation)
            CompassLabels(
              cameraX: _cameraX,
              cameraY: _cameraY,
              categories: ref.watch(galaxyProvider).categories,
              onFlyTo: _flyToCategory,
            ),

            // Category pill
            CategoryPill(
              cameraX: _cameraX,
              cameraY: _cameraY,
              categories: ref.watch(galaxyProvider).categories,
            ),
          ],
        ),
        ),
      ),
    );
  }

  List<Widget> _buildShowCards(Size screenSize) {
    final galaxy = ref.watch(galaxyProvider);
    if (galaxy.isLoading) return [];

    final halfW = screenSize.width / 2;
    final halfH = screenSize.height / 2;
    final widgets = <Widget>[];

    for (final (show, worldPos) in galaxy.visibleShowsWithPositions) {
      var dx = worldPos.dx - _cameraX;
      var dy = worldPos.dy - _cameraY;

      // Wrap around world edges
      if (dx > kWorldW / 2) dx -= kWorldW;
      if (dx < -kWorldW / 2) dx += kWorldW;
      if (dy > kWorldH / 2) dy -= kWorldH;
      if (dy < -kWorldH / 2) dy += kWorldH;

      final sx = dx + halfW;
      final sy = dy + halfH;

      final cat = galaxy.categories.where((c) => c.key == show.categoryKey).firstOrNull;
      final accent = cat?.accentColor ?? AppColors.drama;

      widgets.add(
        Positioned(
          left: sx - show.cardWidth / 2,
          top: sy - show.cardHeight / 2,
          child: IgnorePointer(
            child: ShowCard(
              show: show,
              accentColor: accent,
            ),
          ),
        ),
      );
    }

    return widgets;
  }

  Widget _buildPanHint() {
    return Positioned(
      bottom: 100,
      left: 0,
      right: 0,
      child: Center(
        child: AnimatedOpacity(
          opacity: _hasDragged ? 0.0 : 1.0,
          duration: const Duration(milliseconds: 800),
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.6, end: 1.0),
            duration: const Duration(seconds: 2),
            curve: Curves.easeInOut,
            builder: (context, value, child) {
              return Opacity(opacity: value, child: child);
            },
            onEnd: () {},
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF0E0C18).withValues(alpha: 0.88),
                borderRadius: BorderRadius.circular(100),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.15),
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.queuePurple.withValues(alpha: 0.1),
                    blurRadius: 20,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.swipe, size: 16, color: AppColors.inkSoft),
                  const SizedBox(width: 8),
                  Text(
                    'DRAG TO EXPLORE',
                    style: TextStyle(
                      fontFamily: 'JetBrains Mono',
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: AppColors.inkSoft,
                      letterSpacing: 2.0,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
