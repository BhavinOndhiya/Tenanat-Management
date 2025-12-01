# PG Management Mobile App

This is a React Native + Expo mobile application that mirrors the existing PG Management web frontend. It reuses the same backend APIs and provides the same functionality for both PG Owners and PG Tenants.

## 📁 Project Structure

```
pg-mobile/
├── src/
│   ├── screens/          # All screen components
│   │   ├── auth/         # Authentication screens (Login, Register, ForgotPassword)
│   │   ├── tenant/       # PG Tenant screens
│   │   └── owner/        # PG Owner screens
│   ├── components/       # Reusable UI components
│   ├── context/         # React Context (AuthContext)
│   ├── navigation/      # Navigation setup
│   ├── services/        # Business logic services
│   └── utils/           # Utilities (API client, validation, toast, roles)
├── App.js               # Main app entry point
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for testing)

### Installation

1. Navigate to the project directory:
```bash
cd pg-mobile
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the `pg-mobile` directory:
```
EXPO_PUBLIC_BACKEND_BASE_URL=https://your-api-url.com/api
EXPO_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

4. Start the development server:
```bash
npm start
```

5. Run on your device:
- Scan the QR code with Expo Go (Android) or Camera app (iOS)
- Or press `a` for Android emulator, `i` for iOS simulator

## 📱 Current Implementation Status

### ✅ Completed

- [x] Project setup with React Native + Expo
- [x] Navigation structure with role-based routing
- [x] API client (mirrors web app's api.js)
- [x] Auth context with AsyncStorage
- [x] Validation utilities (mirrors web app)
- [x] Toast notifications
- [x] Login screen
- [x] Register screen
- [x] Forgot Password screen

### 🚧 In Progress / To Be Implemented

#### PG Tenant Screens
- [ ] Dashboard Screen - Mirror `frontend/src/pages/Dashboard.jsx`
  - Display complaints, announcements, events
  - Show PG profile and recent payments
  - Rent payment card component
  
- [ ] Tenant Onboarding Screen - Mirror `frontend/src/pages/TenantOnboarding.jsx`
  - Step 1: PG Details
  - Step 2: eKYC (with image picker for ID front/back, selfie)
  - Step 3: Agreement (OTP, consent flags)
  
- [ ] Payments Screen - Mirror `frontend/src/pages/PgTenantPayments.jsx`
  - Payment history list
  - Statistics
  - Invoice download/view
  - Razorpay integration
  
- [ ] Documents Screen - Mirror `frontend/src/pages/Documents.jsx`
  - View/download eKYC and Agreement PDFs
  - Generate documents functionality
  
- [ ] Events Screen - Mirror `frontend/src/pages/Events.jsx`
  - List events
  - Create event
  - Set participation status
  
- [ ] Profile Screen - Mirror `frontend/src/pages/Profile.jsx`
  - View/edit profile
  - Upload avatar
  - View statistics
  - Onboarding status

#### PG Owner Screens
- [ ] PG Owner Dashboard - Mirror `frontend/src/pages/owner/PgOwnerDashboard.jsx`
  - Complaint overview
  - Payment overview (income summary)
  - Complaints by category/property
  
- [ ] PG Tenant Management - Mirror `frontend/src/pages/owner/PgTenantManagement.jsx`
  - List tenants
  - Add/edit/delete tenants
  - View tenant details
  
- [ ] PG Properties - Mirror `frontend/src/pages/owner/PgProperties.jsx`
  - List properties
  - Add/edit/delete properties
  
- [ ] PG Owner Payments - Mirror `frontend/src/pages/owner/PgOwnerPayments.jsx`
  - Payment history
  - Summary statistics
  
- [ ] Owner Documents - Mirror `frontend/src/pages/owner/OwnerDocuments.jsx`
  - View tenant documents
  
- [ ] PG Owner Complaints - Mirror `frontend/src/pages/owner/PgOwnerComplaints.jsx`
  - List complaints
  - Filter by status/property
  - Update complaint status
  
- [ ] PG Owner Complaint Detail - Mirror `frontend/src/pages/owner/PgOwnerComplaintDetail.jsx`
  - View complaint details
  - Add comments
  - Update status

## 🔧 Key Implementation Notes

### API Integration

The API client (`src/utils/api.js`) mirrors the web app's API structure. All endpoints are the same:
- Uses AsyncStorage instead of localStorage
- Handles FormData for file uploads
- Same error handling and token management

### Navigation

Navigation is handled by `src/navigation/AppNavigator.jsx`:
- Auth stack (Login, Register, ForgotPassword) when not authenticated
- Main app stack based on user role
- Automatic redirect to onboarding for PG_TENANT if not completed

### Razorpay Integration

For mobile, use `react-native-razorpay`:
```javascript
import RazorpayCheckout from 'react-native-razorpay';
import { config } from '../utils/config';

// In payment screen
const options = {
  description: 'PG Rent Payment',
  currency: 'INR',
  key: config.RAZORPAY_KEY_ID || order.razorpayKeyId, // Use from config or order response
  amount: amountInPaise,
  name: 'PG Management',
  order_id: orderId,
  prefill: {
    email: user.email,
    contact: user.phone,
    name: user.name,
  },
  theme: { color: '#2563EB' },
};

RazorpayCheckout.open(options)
  .then((data) => {
    // Handle success
  })
  .catch((error) => {
    // Handle error
  });
```

### OAuth Integration (Google & Facebook)

For mobile OAuth, you'll need to use different SDKs than the web:

**Google Sign-In:**
- Use `@react-native-google-signin/google-signin` or `expo-auth-session`
- Configure with `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

**Facebook Sign-In:**
- Use `react-native-fbsdk-next` or `expo-auth-session`
- Configure with `EXPO_PUBLIC_FACEBOOK_APP_ID`

Note: The API endpoints (`/auth/google` and `/auth/facebook`) remain the same - only the client-side OAuth flow differs.

### File Uploads

Use `expo-image-picker` for images:
```javascript
import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    const file = {
      uri: result.assets[0].uri,
      type: 'image/jpeg',
      name: 'id-front.jpg',
    };
    // Use in FormData
  }
};
```

### PDF Viewing

Use `react-native-pdf` for viewing PDFs:
```javascript
import Pdf from 'react-native-pdf';

<Pdf
  source={{ uri: pdfUrl }}
  style={styles.pdf}
  onLoadComplete={(numberOfPages) => {
    console.log(`Number of pages: ${numberOfPages}`);
  }}
/>
```

## 📋 Implementation Checklist

When implementing each screen:

1. **Read the corresponding web app file** from `frontend/src/pages/`
2. **Identify all API calls** - ensure they're in `src/utils/api.js`
3. **Identify all UI components** - create reusable components in `src/components/`
4. **Mirror the data flow** - same state management, same API calls
5. **Adapt UI for mobile** - use React Native components, maintain same functionality
6. **Test with real backend** - ensure API responses match

## 🎨 UI Components to Create

Create reusable components in `src/components/`:
- `Button.jsx` - Styled button component
- `Card.jsx` - Card container
- `Input.jsx` - Text input with validation
- `Loader.jsx` - Loading spinner
- `Modal.jsx` - Modal dialog
- `RentPaymentCard.jsx` - Rent payment card with Razorpay integration

## 🔐 Environment Variables

Required environment variables (set in `.env` file in `pg-mobile/` directory):

All environment variables from the web frontend are integrated:

- `EXPO_PUBLIC_BACKEND_BASE_URL` - Backend API base URL (mirrors `VITE_BACKEND_BASE_URL` from web)
- `EXPO_PUBLIC_RAZORPAY_KEY_ID` - Razorpay key ID (mirrors `VITE_RAZORPAY_KEY_ID` from web)
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth Client ID (mirrors `VITE_GOOGLE_CLIENT_ID` from web)
- `EXPO_PUBLIC_FACEBOOK_APP_ID` - Facebook App ID (mirrors `VITE_FACEBOOK_APP_ID` from web)

**Note:** In Expo, environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app code (similar to how Vite uses `VITE_` prefix).

Create a `.env` file in the `pg-mobile/` directory with these variables.

## 📦 Dependencies

Key dependencies already installed:
- `@react-navigation/native` - Navigation
- `@react-native-async-storage/async-storage` - Storage
- `react-native-razorpay` - Payment integration
- `expo-image-picker` - Image selection
- `expo-document-picker` - Document selection
- `react-native-pdf` - PDF viewing
- `react-native-toast-message` - Toast notifications

## 🚀 Building for Production

### Android
```bash
eas build --platform android
```

### iOS
```bash
eas build --platform ios
```

Note: You'll need to set up EAS (Expo Application Services) for production builds.

## 📝 Notes

- All screens should mirror the web app's behavior exactly
- Use the same API endpoints and data structures
- Maintain the same validation rules
- Keep the same user flows and navigation patterns
- The backend APIs are read-only - don't modify them

## 🐛 Troubleshooting

### API Connection Issues
- Check `EXPO_PUBLIC_BACKEND_BASE_URL` in `.env`
- Ensure backend CORS allows mobile app origin
- Check network connectivity

### Razorpay Issues
- Verify `EXPO_PUBLIC_RAZORPAY_KEY_ID` is set
- Ensure Razorpay SDK is properly configured
- Check payment order creation API

### File Upload Issues
- Verify file permissions in app.json
- Check FormData format matches backend expectations
- Ensure file size limits are respected

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Razorpay React Native SDK](https://razorpay.com/docs/payments/mobile/react-native/)
- Web App Source: `frontend/src/` directory

