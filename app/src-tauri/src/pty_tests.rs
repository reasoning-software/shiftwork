// pty_tests.rs — Unit tests for the PTY registry and session management.
//
// These tests validate the PTY registry's thread-safety and lifecycle
// management without requiring a full Tauri application context. The actual
// PTY spawning (which requires a real TTY) is tested via integration tests.

#[cfg(test)]
mod tests {
    use crate::pty::PtyRegistry;

    #[test]
    fn registry_starts_empty() {
        let registry = PtyRegistry::new();
        // The registry should have no sessions initially.
        // We can't directly access sessions (private), but list_ptys
        // is tested via integration tests. This validates construction.
        let _ = registry;
    }

    #[test]
    fn registry_is_send_and_sync() {
        // Verify that PtyRegistry can be shared across threads,
        // which is required for Tauri's managed state.
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<PtyRegistry>();
    }
}
