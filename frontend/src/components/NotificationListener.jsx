import { useVouchNotification } from "../hooks/useVouchNotification";
import VouchModal from "./VouchModal";
import Toast from "./Toast";
import { CheckCircle, Star } from "lucide-react";

export default function NotificationListener() {
  const {
    vouchPrompt,
    reputationUpdate,
    dismissVouchPrompt,
    dismissReputationUpdate,
  } = useVouchNotification();

  return (
    <>
      {/* Vouch Prompt Modal */}
      {vouchPrompt && (
        <VouchModal
          task={{
            _id: vouchPrompt.task?.id,
            title: vouchPrompt.task?.title,
            selectedSkills: vouchPrompt.task?.selectedSkills || [],
          }}
          helper={vouchPrompt.task?.helper}
          onClose={dismissVouchPrompt}
          onSuccess={() => {
            dismissVouchPrompt();
          }}
        />
      )}

      {/* Reputation Update Toast */}
      {reputationUpdate && (
        <Toast
          message={`Your reputation increased! Score: ${reputationUpdate.newScore}`}
          type="success"
          icon={<CheckCircle className="w-5 h-5" />}
          onClose={dismissReputationUpdate}
          autoClose={true}
        />
      )}
    </>
  );
}
