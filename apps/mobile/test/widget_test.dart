import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:kelechek/main.dart';

void main() {
  testWidgets('rings painter renders', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Center(
          child: SizedBox(width: 120, height: 120, child: CustomPaint(painter: RingsPainter())),
        ),
      ),
    );
    expect(find.byType(CustomPaint), findsWidgets);
  });
}
