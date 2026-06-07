import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { LoginStatus } from "@/types/login";

export function useAuth() {
	const [status, setStatus] = useState<LoginStatus>("loading");

	const checkStatus = useCallback(async () => {
		try {
			const loggedIn = await invoke<boolean>("login_status");
			setStatus(loggedIn ? "signed_in" : "signed_out");
		} catch {
			setStatus("signed_out");
		}
	}, []);

	useEffect(() => {
		checkStatus();
	}, [checkStatus]);

	const openBrowser = useCallback(async () => {
		await invoke("login_open_browser");
	}, []);

	const submitMagicLink = useCallback(
		async (link: string): Promise<boolean> => {
			try {
				await invoke<string>("login_submit_magic_link", {
					magicLink: link,
				});
				setStatus("signed_in");
				return true;
			} catch {
				return false;
			}
		},
		[],
	);

	const logout = useCallback(async () => {
		try {
			await invoke("login_logout");
		} catch {
			// ignore
		}
		setStatus("signed_out");
	}, []);

	return { status, openBrowser, submitMagicLink, logout, checkStatus };
}
