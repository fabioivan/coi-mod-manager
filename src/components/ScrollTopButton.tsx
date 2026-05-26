import { ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface ScrollTopButtonProps {
	show: boolean;
	onClick: () => void;
}

export function ScrollTopButton({ show, onClick }: ScrollTopButtonProps) {
	const { t } = useTranslation();
	if (!show) return null;
	return (
		<Button
			onClick={onClick}
			size="icon"
			className="fixed bottom-6 right-6 w-10 h-10 rounded-full shadow-lg z-100"
			title={t("modList.back_to_top")}
		>
			<ChevronUp size={20} />
		</Button>
	);
}
