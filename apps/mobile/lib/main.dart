import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

const String kBaseUrl = String.fromEnvironment('BASE_URL', defaultValue: 'https://qelechek.kg/');
const String kAppVersion = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0');

const Color kBg = Color(0xFF0B0D11);
const Color kSurface = Color(0xFF141821);
const Color kLine = Color(0xFF262D3B);
const Color kMint = Color(0xFF3DDC97);
const Color kBlue = Color(0xFF6F9BFF);
const Color kOrange = Color(0xFFFFB84D);
const Color kPink = Color(0xFFFF6FAE);
const Color kMuted = Color(0xFFA3ACBD);

const Set<String> kInAppSchemes = {'http', 'https', 'about', 'data', 'blob', 'javascript'};

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: kBg,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarColor: kBg,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const KelechekApp());
}

class KelechekApp extends StatelessWidget {
  const KelechekApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kelechek',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: kBg,
        colorScheme: const ColorScheme.dark(primary: kMint, secondary: kBlue, surface: kSurface),
        useMaterial3: true,
      ),
      home: const SiteScreen(),
    );
  }
}

class _Strings {
  const _Strings(this.offlineTitle, this.offlineText, this.retry, this.loading);
  final String offlineTitle;
  final String offlineText;
  final String retry;
  final String loading;

  static _Strings of(BuildContext context) {
    final lang = Localizations.maybeLocaleOf(context)?.languageCode ??
        WidgetsBinding.instance.platformDispatcher.locale.languageCode;
    if (lang == 'ky') {
      return const _Strings(
        'Байланыш жок',
        'Интернетти текшерип, кайра аракет кылыңыз.',
        'Кайра аракет кылуу',
        'Жүктөлүүдө…',
      );
    }
    return const _Strings(
      'Нет соединения',
      'Проверьте интернет и попробуйте ещё раз.',
      'Повторить',
      'Загрузка…',
    );
  }
}

class SiteScreen extends StatefulWidget {
  const SiteScreen({super.key});

  @override
  State<SiteScreen> createState() => _SiteScreenState();
}

class _SiteScreenState extends State<SiteScreen> {
  late final WebViewController _controller;
  int _progress = 0;
  bool _firstLoadDone = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController(onPermissionRequest: _onPermissionRequest)
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(kBg)
      ..setNavigationDelegate(NavigationDelegate(
        onProgress: (p) => setState(() => _progress = p),
        onPageStarted: (_) => setState(() => _failed = false),
        onPageFinished: (_) => setState(() {
          _firstLoadDone = true;
          _progress = 100;
        }),
        onWebResourceError: (error) {
          if (error.isForMainFrame ?? true) setState(() => _failed = true);
        },
        onNavigationRequest: _onNavigationRequest,
      ));

    final platform = _controller.platform;
    if (platform is AndroidWebViewController) {
      platform.setMediaPlaybackRequiresUserGesture(false);
    }
    _init();
  }

  Future<void> _init() async {
    final ua = await _controller.getUserAgent();
    await _controller.setUserAgent('${ua ?? ''} KelechekApp/$kAppVersion'.trim());
    await _controller.loadRequest(Uri.parse(kBaseUrl));
  }

  Future<void> _onPermissionRequest(WebViewPermissionRequest request) async {
    final types = request.types;
    final wantsCamera = types.contains(WebViewPermissionResourceType.camera);
    final wantsMic = types.contains(WebViewPermissionResourceType.microphone);
    var granted = true;
    if (wantsCamera) granted = (await Permission.camera.request()).isGranted && granted;
    if (wantsMic) granted = (await Permission.microphone.request()).isGranted && granted;
    if (granted && (wantsCamera || wantsMic)) {
      await request.grant();
    } else {
      await request.deny();
    }
  }

  Future<NavigationDecision> _onNavigationRequest(NavigationRequest request) async {
    final uri = Uri.tryParse(request.url);
    if (uri == null || kInAppSchemes.contains(uri.scheme)) {
      return NavigationDecision.navigate;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
    return NavigationDecision.prevent;
  }

  Future<void> _onBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
    } else {
      await SystemNavigator.pop();
    }
  }

  void _retry() {
    setState(() {
      _failed = false;
      _progress = 0;
    });
    _controller.reload();
  }

  @override
  Widget build(BuildContext context) {
    final s = _Strings.of(context);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _onBack();
      },
      child: Scaffold(
        backgroundColor: kBg,
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_progress < 100 && _firstLoadDone && !_failed)
                LinearProgressIndicator(
                  value: _progress / 100,
                  minHeight: 2,
                  backgroundColor: Colors.transparent,
                  color: kMint,
                ),
              if (!_firstLoadDone && !_failed) _Splash(progress: _progress, label: s.loading),
              if (_failed) _Offline(strings: s, onRetry: _retry),
            ],
          ),
        ),
      ),
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash({required this.progress, required this.label});
  final int progress;
  final String label;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: kBg,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(width: 120, height: 120, child: CustomPaint(painter: RingsPainter())),
            const SizedBox(height: 28),
            const Text(
              'Kelechek',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5, color: Colors.white),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: 160,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: progress > 0 ? progress / 100 : null,
                  minHeight: 4,
                  backgroundColor: kLine,
                  color: kMint,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(label, style: const TextStyle(color: kMuted, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

class _Offline extends StatelessWidget {
  const _Offline({required this.strings, required this.onRetry});
  final _Strings strings;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: kBg,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: kSurface,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: kLine),
                ),
                child: const Icon(Icons.wifi_off_rounded, color: kMint, size: 34),
              ),
              const SizedBox(height: 22),
              Text(
                strings.offlineTitle,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white),
              ),
              const SizedBox(height: 8),
              Text(
                strings.offlineText,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, color: kMuted, height: 1.4),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: const LinearGradient(colors: [kMint, kBlue]),
                  ),
                  child: TextButton(
                    onPressed: onRetry,
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF04101A),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    child: Text(strings.retry),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class RingsPainter extends CustomPainter {
  const RingsPainter();

  static const _values = [1.0, 0.68, 0.3, 0.0];
  static const _colors = [kMint, kBlue, kOrange, kPink];

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final stroke = size.width * 0.075;
    final gap = stroke * 0.45;
    for (var i = 0; i < _values.length; i++) {
      final r = size.width / 2 - stroke / 2 - i * (stroke + gap);
      if (r <= 0) break;
      final rect = Rect.fromCircle(center: center, radius: r);
      canvas.drawCircle(
        center,
        r,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke
          ..color = kLine,
      );
      if (_values[i] > 0) {
        canvas.drawArc(
          rect,
          -math.pi / 2,
          2 * math.pi * _values[i],
          false,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = stroke
            ..strokeCap = StrokeCap.round
            ..color = _colors[i],
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
