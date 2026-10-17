# Sent Sound 1.0.0

## Install on macOS

1. Save `sent-sound-1.0.0.xpi` locally.
2. In Thunderbird, open Tools → Add-ons and Themes → Extensions.
3. Open the gear menu → Install Add-on From File… and choose the XPI. Accept the requested permissions.
4. Open Sent Sound's Preferences/Options (sometimes in its three-dot menu).
5. Click Browse…, choose a WAV, and click Play. Leave the playback checkbox enabled for automatic sound.

You can change the WAV at any time. Changes save automatically. The file is copied into the add-on's local storage; its original path is not retained or monitored. Maximum WAV size: 3 MiB. Standard PCM WAV is recommended. Invalid or undecodable replacements leave the previous sound intact. No sound ships preselected; `test-tone.wav` is an optional short example.

## Behavior and limits

The add-on listens to `compose.onAfterSend` with the `compose` permission and plays only for `mode === "sendNow"` with no `error` property. It does not rely on a Sent folder copy, which can be disabled. It does not intercept Send or send messages itself.

Successful sending means Thunderbird completed its sending operation; this is not a delivery/read receipt. Failures and cancellation produce no confirmation sound. Drafts and queued Send Later messages produce no sound. Eventual sending from the Outbox is NOT covered by this API/add-on. A sent message followed by an FCC/copy error may also produce no sound, because Thunderbird reports an unsuccessful overall operation.

Playback uses HTMLAudioElement in a persistent Manifest V2 background document, independent of the compose or preferences window. Rapid sends restart the sound rather than mixing overlapping sounds. Preview uses the same background playback path, even when automatic playback is disabled. Playback errors are logged to the extension console and shown when preferences are reopened. System mute/output volume still applies.

Requires Thunderbird 128 or newer by manifest. The APIs used are documented for current Thunderbird; this is not a claim that every release has been runtime-tested. No experiments, native helper, network access, or external services. Only compose and storage permissions are requested. Thunderbird labels compose permission broadly as access to composing messages, although this implementation ignores message contents. This is a locally installable XPI, not a reviewed or published Thunderbird Add-ons listing.

## Validation performed

- Official current Thunderbird MailExtension docs checked for onAfterSend, permission, error, and send modes.
- Installed Thunderbird 158.0 macOS application's packaged compose schema and event implementation inspected: compatible event signature, compose permission, separate success/failure handling, sendNow/sendLater modes.
- Six Node automated tests pass: success filtering (including no FCC copy), failure/queue rejection, enable/disable, preview, missing sound, error recording, rapid events, and WAV signature/size checks.
- JavaScript syntax and ZIP/manifest integrity checked.
- An isolated headless Thunderbird 158 launch was attempted; the process exited with code 134 before a runtime report was produced. Actual installation, WAV decoding/audio output, and real SMTP sending have NOT been end-to-end verified. Mock tests do not establish real audio or SMTP behavior.

## Quick acceptance check after installation

Choose a short PCM WAV → Play should be audible. Close preferences and send a message normally → the sound should follow successful completion. Disable playback and repeat → silence. Re-enable and restart Thunderbird → the chosen file should persist. An offline Send Later operation should remain silent. A send that Thunderbird reports as failed should remain silent. Real outgoing test messages are the user's choice; none were sent during development.

## Source and rebuild

The source ZIP includes the ready-to-install `sent-sound-1.0.0.xpi` alongside this README, the tests, and the editable `source/` directory. `source/` contains the complete add-on, without dependencies or a build step. Run `node --test tests/background.test.cjs`. To rebuild, run `python3 build.py` from this directory. The XPI is a ZIP archive with manifest.json at its root. Test-only instrumentation is not included in the distributed XPI.

## API references

- https://webextension-api.thunderbird.net/en/mv2/compose.html#onaftersend
- https://developer.thunderbird.net/add-ons/mailextensions/supported-manifest-keys
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background
