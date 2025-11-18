import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountModal({ open, onOpenChange }: DeleteAccountModalProps) {
  const { user, logout } = useAuthStore();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (text !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/users/${user!.id}`);
      toast.success("Account deleted");
      logout();
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-500">Delete Account</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This action is <span className="text-red-500 font-medium">permanent</span> and cannot be undone.
        </p>

        <p className="text-sm mt-4">
          Type <span className="font-bold">DELETE</span> to confirm:
        </p>

        <Input value={text} onChange={(e) => setText(e.target.value)} />

        <Button 
          variant="destructive" 
          className="w-full mt-4"
          disabled={loading}
          onClick={handleDelete}
        >
          {loading ? "Deleting..." : "Delete Account"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
