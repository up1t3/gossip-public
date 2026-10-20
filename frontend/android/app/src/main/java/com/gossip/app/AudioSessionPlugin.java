package com.gossip.app;

import android.content.Context;
import android.media.AudioManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioSessionPlugin")
public class AudioSessionPlugin extends Plugin {
    private AudioManager audioManager;
    private int originalMode = AudioManager.MODE_NORMAL;
    private boolean originalSpeakerphone = false;

    @Override
    public void load() {
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    @PluginMethod
    public void setCommunicationMode(PluginCall call) {
        try {
            originalMode = audioManager.getMode();
            originalSpeakerphone = audioManager.isSpeakerphoneOn();

            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            audioManager.startBluetoothSco();
            audioManager.setBluetoothScoOn(true);
            audioManager.setSpeakerphoneOn(false);

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set communication mode: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setNormalMode(PluginCall call) {
        try {
            audioManager.stopBluetoothSco();
            audioManager.setBluetoothScoOn(false);
            audioManager.setMode(originalMode);
            audioManager.setSpeakerphoneOn(originalSpeakerphone);

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set normal mode: " + e.getMessage());
        }
    }
}
