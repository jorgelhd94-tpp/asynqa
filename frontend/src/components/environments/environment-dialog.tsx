import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  useCreateEnvironment,
  useUpdateEnvironment,
  useTestConnection,
} from "@/hooks/use-environments";
import type { Environment, EnvironmentFormData } from "./types";
import React, { useEffect, useState } from "react";
import { sileo } from "sileo";
import { getErrorMessage } from "@/lib/errors";

type EnvironmentDialogProps = {
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment?: Environment;
};

const defaultFormData: EnvironmentFormData = {
  Name: "",
  Host: "",
  Password: "",
  DB: 0,
  UseTLS: false,
  TLSSkipVerify: false,
};

export function EnvironmentDialog({
  trigger,
  open,
  onOpenChange,
  environment,
}: EnvironmentDialogProps) {
  const isEdit = !!environment;
  const [form, setForm] = useState<EnvironmentFormData>(defaultFormData);

  const createMutation = useCreateEnvironment();
  const updateMutation = useUpdateEnvironment();
  const testMutation = useTestConnection();

  useEffect(() => {
    if (open && environment) {
      const { Name, Host, Password, DB, UseTLS, TLSSkipVerify } = environment;
      setForm({ Name, Host, Password, DB, UseTLS, TLSSkipVerify });
    } else if (!open) {
      setForm(defaultFormData);
    }
  }, [open, environment]);

  const handleSubmit = () => {
    if (isEdit && environment) {
      updateMutation.mutate(
        { ...form, ID: environment.ID },
        {
          onSuccess: () => {
            sileo.success({ title: "Environment updated successfully" });
            onOpenChange(false);
          },
        }
      );
    } else {
      createMutation.mutate(form, {
        onSuccess: () => {
          sileo.success({ title: "Environment created successfully" });
          onOpenChange(false);
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputClass =
    "border-(--color-divider) bg-(--color-primary-dark) text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-accent-val) focus:ring-(--color-accent-val)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg border-(--color-divider) text-(--color-text-primary)">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold text-(--color-text-primary)">
            {isEdit ? "Edit Redis connection" : "New Redis connection"}
          </DialogTitle>
          <DialogDescription className="text-(--color-text-secondary)">
            Set up the connection details. You can test it before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="env-name" className="text-sm text-(--color-text-secondary)">
              Name
            </Label>
            <Input
              id="env-name"
              placeholder="e.g. Production"
              className={inputClass}
              value={form.Name}
              onChange={(e) => setForm({ ...form, Name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="env-host" className="text-sm text-(--color-text-secondary)">
              Host
            </Label>
            <Input
              id="env-host"
              placeholder="e.g. 127.0.0.1:6379"
              className={inputClass}
              value={form.Host}
              onChange={(e) => setForm({ ...form, Host: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="env-password" className="text-sm text-(--color-text-secondary)">
                Password
              </Label>
              <Input
                id="env-password"
                type="password"
                placeholder="Optional"
                className={inputClass}
                value={form.Password}
                onChange={(e) => setForm({ ...form, Password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="env-db" className="text-sm text-(--color-text-secondary)">
                DB
              </Label>
              <Input
                id="env-db"
                type="number"
                min={0}
                placeholder="0"
                className={inputClass}
                value={form.DB}
                onChange={(e) =>
                  setForm({ ...form, DB: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-(--color-text-secondary)">
              <Checkbox
                id="env-tls"
                checked={form.UseTLS}
                onCheckedChange={(checked) =>
                  setForm({ ...form, UseTLS: checked === true })
                }
              />
              <span>Use TLS</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-(--color-text-secondary)">
              <Checkbox
                id="env-skip"
                checked={form.TLSSkipVerify}
                onCheckedChange={(checked) =>
                  setForm({ ...form, TLSSkipVerify: checked === true })
                }
              />
              <span>Skip TLS verification</span>
            </label>
          </div>
        </div>

        <DialogFooter className="mt-2 flex-row! items-center justify-between!">
          <Button
            variant="outline"
            className="border-(--color-warning) text-(--color-text-primary) hover:bg-(--color-warning)/10"
            disabled={testMutation.isPending || !form.Host}
            onClick={() =>
              testMutation.mutate(form, {
                onSuccess: () => {
                  sileo.success({ title: "Connection successful" });
                },
                onError: (error) => {
                  sileo.error({
                    title: "Connection failed",
                    description: getErrorMessage(error),
                  });
                },
              })
            }
          >
            {testMutation.isPending ? "Testing..." : "Test connection"}
          </Button>
          <div className="flex gap-2">
          <Button
            variant="ghost"
            className="text-(--color-text-secondary) hover:bg-(--color-primary-dark)"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-(--color-accent-val) text-white hover:bg-(--color-accent-dark)"
            onClick={handleSubmit}
            disabled={isPending || !form.Name || !form.Host}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
