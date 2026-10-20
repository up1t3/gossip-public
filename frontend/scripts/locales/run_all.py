# -*- coding: utf-8 -*-
import os
import sys

# Ensure current dir is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import gen_common
import gen_auth
import gen_chat
import gen_wallet
import gen_pulse
import gen_settings
import gen_landing
import gen_calls

def main():
    base_dir = os.path.abspath("e:/Boltalka/frontend/src/i18n/locales")
    print(f"Generating all 64 locale files in: {base_dir}")
    
    gen_common.generate(base_dir)
    gen_auth.generate(base_dir)
    gen_chat.generate(base_dir)
    gen_wallet.generate(base_dir)
    gen_pulse.generate(base_dir)
    gen_settings.generate(base_dir)
    gen_landing.generate(base_dir)
    gen_calls.generate(base_dir)
    
    print("\n✓ SUCCESS: All 64 JSON dictionaries (8 languages x 8 namespaces) successfully created!")

if __name__ == "__main__":
    main()
