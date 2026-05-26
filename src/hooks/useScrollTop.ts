import { useEffect, useRef, useState } from "react";

export function useScrollTop(threshold = 400) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [show, setShow] = useState(false);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const onScroll = () => setShow(el.scrollTop > threshold);
		el.addEventListener("scroll", onScroll, { passive: true });
		return () => el.removeEventListener("scroll", onScroll);
	}, [threshold]);

	function scrollToTop() {
		scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
	}

	return { scrollRef, show, scrollToTop };
}
