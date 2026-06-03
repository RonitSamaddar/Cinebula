import 'package:flutter_test/flutter_test.dart';
import 'package:cinebula/main.dart';

void main() {
  testWidgets('App renders galaxy screen', (WidgetTester tester) async {
    await tester.pumpWidget(const CinebulaApp());
    await tester.pump();
    expect(find.text('DRAG TO EXPLORE'), findsOneWidget);
  });
}
