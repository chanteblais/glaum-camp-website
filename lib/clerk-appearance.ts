import type { Appearance } from '@clerk/nextjs/server'

export const clerkAppearance: Appearance = {
  variables: {
    colorBackground:       '#100818',
    colorPrimary:          '#C8A848',
    colorText:             '#F3EDE6',
    colorTextSecondary:    'rgba(243,237,230,0.5)',
    colorInputBackground:  'rgba(255,255,255,0.05)',
    colorInputText:        '#F3EDE6',
    colorNeutral:          '#F3EDE6',
    colorDanger:           '#ff8a8a',
    colorSuccess:          '#7dcf8e',
    borderRadius:          '0.65rem',
    fontFamily:            'Georgia, serif',
    fontFamilyButtons:     'Georgia, serif',
    fontSize:              '0.95rem',
  },
  elements: {
    card: {
      background:   'linear-gradient(160deg, #130820 0%, #0E0618 100%)',
      border:       '1px solid rgba(200,168,72,0.22)',
      boxShadow:    '0 0 0 1px rgba(200,168,72,0.08), 0 8px 48px rgba(0,0,0,0.6), 0 0 60px rgba(210,57,248,0.08)',
      padding:      '2rem',
    },
    headerTitle: {
      fontFamily:   'TokyoDreams, serif',
      color:        '#C8A848',
      letterSpacing:'0.06em',
      textShadow:   '0 0 20px rgba(200,168,72,0.3)',
    },
    headerSubtitle: {
      color:        'rgba(243,237,230,0.45)',
      fontSize:     '0.85rem',
    },
    logoImage: {
      filter: 'brightness(1.1)',
    },
    socialButtonsBlockButton: {
      background:   'rgba(255,255,255,0.04)',
      border:       '1px solid rgba(200,168,72,0.2)',
      color:        '#F3EDE6',
    },
    socialButtonsBlockButtonText: {
      color:        '#F3EDE6',
    },
    dividerLine: {
      background:   'rgba(200,168,72,0.15)',
    },
    dividerText: {
      color:        'rgba(243,237,230,0.35)',
    },
    formFieldLabel: {
      color:        'rgba(243,237,230,0.65)',
      fontSize:     '0.8rem',
      letterSpacing:'0.05em',
    },
    formFieldInput: {
      background:   'rgba(255,255,255,0.05)',
      border:       '1px solid rgba(200,168,72,0.2)',
      color:        '#F3EDE6',
    },
    formFieldInputShowPasswordButton: {
      color:        'rgba(243,237,230,0.5)',
    },
    formButtonPrimary: {
      background:    'linear-gradient(135deg, #C8A848 0%, #A8882A 100%)',
      color:         '#1A0800',
      fontWeight:    '600',
      letterSpacing: '0.06em',
      boxShadow:     '0 2px 12px rgba(200,168,72,0.25)',
    },
    footerActionLink: {
      color:        '#C8A848',
    },
    footerActionText: {
      color:        'rgba(243,237,230,0.4)',
    },
    identityPreviewText: {
      color: '#F3EDE6',
    },
    identityPreviewEditButton: {
      color: '#C8A848',
    },
    otpCodeFieldInput: {
      border:     '1px solid rgba(200,168,72,0.3)',
      background: 'rgba(255,255,255,0.05)',
      color:      '#F3EDE6',
    },
    alertText: {
      color: '#F3EDE6',
    },
    formResendCodeLink: {
      color: '#C8A848',
    },
  },
}
