# Test Flutter App

A simple Flutter application to test the AI Code Reviewer workflow.

## Platforms

This Flutter app is configured to run only on:
- **Android** (Mobile)
- **iOS** (Mobile)

Desktop and web platforms have been disabled to focus on mobile development.

## Setup

1. This app uses the AI Code Reviewer workflow from the parent repository
2. The workflow is configured to use the `minimax/minimax-m2:free` model
3. Actor role is set to "Senior Mobile Engineer" for Flutter/Dart specific reviews

## Workflow Configuration

The app includes:
- `.github/workflows/pr-review.yml` - AI code review workflow
- `.ai-review-ignore` - Flutter-specific file exclusions
- Modified `lib/main.dart` - Cleaned up Flutter code for testing

## Testing the AI Code Review

1. Create a pull request with changes to `lib/main.dart`
2. The AI reviewer will automatically:
   - Analyze the Dart/Flutter code
   - Provide feedback from a "Senior Mobile Engineer" perspective
   - Comment directly on the PR
   - Send Discord notifications (if configured)

## File Exclusions

The following files are automatically excluded from AI review:
- Build outputs (`build/`, `android/app/build/`, etc.)
- Generated files (`.dart_tool/`, `lib/generated_plugin_registrant.dart`)
- Dependencies (`ios/Pods/`, `android/.gradle/`)
- IDE files (`.idea/`, `.vscode/`)
- Documentation and lock files

## Running the App

```bash
cd test_flutter_app
flutter run  # Runs on connected device (Android/iOS)
```

Or use your IDE's Flutter run button.
