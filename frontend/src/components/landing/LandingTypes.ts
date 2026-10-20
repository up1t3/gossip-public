export type LandingTheme = 'dark' | 'light' | 'coffee';

export interface LandingSharedProps {
  theme: LandingTheme;
  scrollToSection: (id: string) => void;
}
