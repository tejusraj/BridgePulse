
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

export const FONT_INTER = 'Inter_400Regular';
export const FONT_INTER_MEDIUM = 'Inter_500Medium';
export const FONT_MONO = 'JetBrainsMono_400Regular';

export function useAppFonts() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    JetBrainsMono_400Regular,
  });
  return { fontsLoaded, fontError };
}
