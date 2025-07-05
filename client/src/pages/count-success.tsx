import { useLocation, useParams } from "wouter";
import SuccessModal from "@/components/success-modal";

export default function CountSuccessPage() {
  const [, setLocation] = useLocation();
  const { id: countId } = useParams();

  const handleClose = () => {
    setLocation("/");
  };

  return (
    <SuccessModal isOpen={true} onClose={handleClose} countId={countId as string} />
  );
}
