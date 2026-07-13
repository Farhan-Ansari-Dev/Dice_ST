// Polyfills must be loaded first — order matters
import './src/polyfills';
import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
