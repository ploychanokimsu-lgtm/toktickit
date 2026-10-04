import {
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";

import {
  ApiError,
  createActionTaken,
  getStaffActionTaken,
  listRequesterActionsTaken,
  listStaffActionsTaken,
  updateActionTaken,
  type ActionTaken,
  type ActionTakenFields,
  type ActionTakenStatus,
} from "./actions-taken-api.js";

// Lab 4 Actions Taken section for Ticket Detail (Issue #57).
// Staff mode lists, creates, views and edits actions; Requester mode is read-only.

export interface StaffMemberOption {
  id: number;
  name: string;
  role: string;
}

interface ActionsTakenProps {
  ticketId: number;
  mode: "staff" | "requester";
  ticketStatus: string;
  currentUser?: { id: number; name: string };
  staffMembers?: StaffMemberOption[];
  onChanged?: () => void;
}

type View =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "view"; id: number }
  | { kind: "edit"; id: number; presetStatus?: ActionTakenStatus };

const LOCKED_TICKET_STATUSES = ["CLOSED", "CANCELLED"];

const STATUS_LABELS: Record<ActionTakenStatus, string> = {
  PLANNED: "Planned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_BADGES: Record<ActionTakenStatus, string> = {
  PLANNED: "tk-badge tk-badge-medium",
  COMPLETED: "tk-badge tk-badge-new",
  CANCELLED: "tk-badge tk-badge-neutral",
};

const LIMITS = {
  description: 2000,
  result: 2000,
  followUpNote: 1000,
  attachmentNotes: 500,
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// datetime-local works in local time without a zone.
export function toLocalInput(value: Date | string): string {
  const date = new Date(value);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function StatusBadge({ status }: { status: ActionTakenStatus }) {
  return <span className={STATUS_BADGES[status]}>{STATUS_LABELS[status]}</span>;
}

function FollowUpBadge({ action }: { action: ActionTaken }) {
  return action.followUpRequired ? (
    <span className="tk-badge tk-badge-high">
      <span aria-hidden="true">⚑ </span>Follow-up needed
    </span>
  ) : (
    <span>No</span>
  );
}

// ============================================================
// Create / edit form
// ============================================================

interface FormValues {
  status: ActionTakenStatus;
  actionAt: string;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
  assigneeId: string;
}

function valuesFrom(
  action: ActionTaken | null,
  currentUserId: number | undefined,
  presetStatus?: ActionTakenStatus
): FormValues {
  if (!action) {
    return {
      status: "COMPLETED",
      actionAt: toLocalInput(new Date()),
      description: "",
      result: "",
      followUpRequired: false,
      followUpNote: "",
      attachmentNotes: "",
      assigneeId: currentUserId ? String(currentUserId) : "",
    };
  }

  return {
    status: presetStatus ?? action.status,
    actionAt: toLocalInput(action.actionAt),
    description: action.description,
    result: action.result ?? "",
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote ?? "",
    attachmentNotes: action.attachmentNotes ?? "",
    assigneeId: action.assignee ? String(action.assignee.id) : "",
  };
}

export function validateForm(values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.actionAt || Number.isNaN(new Date(values.actionAt).getTime())) {
    errors.actionAt = "Action Date/Time is required.";
  } else if (
    values.status === "COMPLETED" &&
    new Date(values.actionAt).getTime() > Date.now() + 5 * 60 * 1000
  ) {
    errors.actionAt = "Action Date/Time cannot be in the future for completed work.";
  }

  if (!values.description.trim()) {
    errors.description = "Action Description is required.";
  } else if (values.description.trim().length > LIMITS.description) {
    errors.description = `Action Description must be ${LIMITS.description} characters or fewer.`;
  }

  if (values.status === "COMPLETED" && !values.result.trim()) {
    errors.result = "Result is required for completed work.";
  } else if (values.result.trim().length > LIMITS.result) {
    errors.result = `Result must be ${LIMITS.result} characters or fewer.`;
  }

  if (values.followUpRequired && !values.followUpNote.trim()) {
    errors.followUpNote = "Follow-up Note is required when follow-up is needed.";
  } else if (values.followUpNote.trim().length > LIMITS.followUpNote) {
    errors.followUpNote = `Follow-up Note must be ${LIMITS.followUpNote} characters or fewer.`;
  }

  if (values.attachmentNotes.trim().length > LIMITS.attachmentNotes) {
    errors.attachmentNotes = `Attachment Notes must be ${LIMITS.attachmentNotes} characters or fewer.`;
  }

  return errors;
}

function toFields(values: FormValues): ActionTakenFields {
  return {
    status: values.status,
    actionAt: new Date(values.actionAt).toISOString(),
    description: values.description.trim(),
    result: values.result.trim() || null,
    followUpRequired: values.followUpRequired,
    followUpNote: values.followUpRequired ? values.followUpNote.trim() : null,
    attachmentNotes: values.attachmentNotes.trim() || null,
    assigneeId: values.assigneeId ? Number(values.assigneeId) : null,
  };
}

const FIELD_ORDER = [
  "status",
  "actionAt",
  "description",
  "result",
  "followUpRequired",
  "followUpNote",
  "attachmentNotes",
  "assigneeId",
];

interface ActionTakenFormProps {
  action: ActionTaken | null;
  presetStatus?: ActionTakenStatus;
  currentUser?: { id: number; name: string };
  staffMembers: StaffMemberOption[];
  onSubmit: (fields: ActionTakenFields, clientRequestId: string) => Promise<void>;
  onCancel: () => void;
  onReloadLatest?: () => Promise<ActionTaken | null>;
}

function ActionTakenForm({
  action,
  presetStatus,
  currentUser,
  staffMembers,
  onSubmit,
  onCancel,
  onReloadLatest,
}: ActionTakenFormProps) {
  const prefix = useId();
  const fieldId = (name: string) => `${prefix}-${name}`;

  const [values, setValues] = useState<FormValues>(() =>
    valuesFrom(action, currentUser?.id, presetStatus)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  // One ID per opened form, so a retried submit cannot create a duplicate.
  const [clientRequestId] = useState(newClientRequestId);

  const isEdit = action !== null;
  const statusOptions: ActionTakenStatus[] = !isEdit
    ? ["COMPLETED", "PLANNED"]
    : action.status === "PLANNED"
      ? ["PLANNED", "COMPLETED", "CANCELLED"]
      : [action.status];

  function update<K extends keyof FormValues>(name: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function focusFirstError(fieldErrors: Record<string, string>) {
    const first = FIELD_ORDER.find((name) => fieldErrors[name]);
    if (first) {
      document.getElementById(fieldId(first))?.focus();
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (saving) return;

    setFormError("");
    setConflict(false);

    const clientErrors = validateForm(values);
    setErrors(clientErrors);

    if (Object.keys(clientErrors).length > 0) {
      setFormError("Please correct the highlighted fields.");
      focusFirstError(clientErrors);
      return;
    }

    setSaving(true);

    try {
      await onSubmit(toFields(values), clientRequestId);
    } catch (error) {
      // Entered values are kept on every failure.
      if (error instanceof ApiError && error.code === "ACTION_TAKEN_CHANGED") {
        setConflict(true);
      } else if (error instanceof ApiError && Object.keys(error.details).length) {
        setErrors(error.details);
        setFormError(error.message);
        focusFirstError(error.details);
      } else {
        setFormError(errorMessage(error, "The Action Taken could not be saved."));
      }
    } finally {
      setSaving(false);
    }
  }

  async function reloadLatest() {
    if (!onReloadLatest) return;

    try {
      const latest = await onReloadLatest();

      if (latest) {
        setValues(valuesFrom(latest, currentUser?.id));
      }

      setConflict(false);
      setErrors({});
      setFormError("");
    } catch (error) {
      setFormError(errorMessage(error, "The latest version could not be loaded."));
    }
  }

  const describedBy = (name: string, help?: boolean) =>
    [errors[name] ? fieldId(`${name}-error`) : "", help ? fieldId(`${name}-help`) : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  const fieldError = (name: string) =>
    errors[name] ? (
      <div id={fieldId(`${name}-error`)} className="tk-field-error">
        {errors[name]}
      </div>
    ) : null;

  const resultRequired = values.status === "COMPLETED";

  return (
    <form
      className="tk-action-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={isEdit ? "Edit Action Taken" : "Add Action Taken"}
    >
      <h3 className="tk-action-form-title">
        {isEdit ? "Edit Action Taken" : "Add Action Taken"}
      </h3>

      {conflict && (
        <div className="tk-alert tk-alert-warning" role="alert">
          This action was changed by someone else. Your edits are still shown below.{" "}
          <button
            type="button"
            className="tk-button tk-button-secondary tk-button-sm"
            onClick={() => void reloadLatest()}
          >
            Reload latest
          </button>
        </div>
      )}

      {formError && (
        <div className="tk-alert tk-alert-error" role="alert">
          {formError}
        </div>
      )}

      <div className="tk-action-form-grid">
        <div className="tk-form-group">
          <label className="tk-label" htmlFor={fieldId("status")}>
            Status
          </label>
          <select
            id={fieldId("status")}
            className="tk-select"
            value={values.status}
            disabled={saving || statusOptions.length === 1}
            aria-describedby={describedBy("status")}
            onChange={(event) =>
              update("status", event.target.value as ActionTakenStatus)
            }
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {fieldError("status")}
        </div>

        <div className="tk-form-group">
          <label className="tk-label" htmlFor={fieldId("actionAt")}>
            Action Date/Time <span className="tk-required">(required)</span>
          </label>
          <input
            id={fieldId("actionAt")}
            type="datetime-local"
            className={`tk-input${errors.actionAt ? " tk-input-invalid" : ""}`}
            value={values.actionAt}
            disabled={saving}
            aria-invalid={Boolean(errors.actionAt)}
            aria-describedby={describedBy("actionAt")}
            onChange={(event) => update("actionAt", event.target.value)}
          />
          {fieldError("actionAt")}
        </div>

        <div className="tk-form-group">
          <label className="tk-label" htmlFor={fieldId("assigneeId")}>
            Assignee
          </label>
          <select
            id={fieldId("assigneeId")}
            className={`tk-select${errors.assigneeId ? " tk-select-invalid" : ""}`}
            value={values.assigneeId}
            disabled={saving}
            aria-invalid={Boolean(errors.assigneeId)}
            aria-describedby={describedBy("assigneeId")}
            onChange={(event) => update("assigneeId", event.target.value)}
          >
            <option value="">No assignee</option>
            {staffMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
            {/* Keep a stored assignee who is no longer active visible. */}
            {action?.assignee &&
              !staffMembers.some((member) => member.id === action.assignee?.id) && (
                <option value={action.assignee.id}>
                  {action.assignee.name} (inactive)
                </option>
              )}
          </select>
          {fieldError("assigneeId")}
        </div>

        <div className="tk-form-group">
          <span className="tk-label" id={fieldId("performedBy-label")}>
            Performed by
          </span>
          <div className="tk-readonly" aria-labelledby={fieldId("performedBy-label")}>
            {action
              ? action.performedBy.name
              : `You (${currentUser?.name ?? "current user"})`}
          </div>
        </div>
      </div>

      <div className="tk-form-group">
        <label className="tk-label" htmlFor={fieldId("description")}>
          Action Description <span className="tk-required">(required)</span>
        </label>
        <textarea
          id={fieldId("description")}
          className={`tk-textarea${errors.description ? " tk-textarea-invalid" : ""}`}
          rows={3}
          value={values.description}
          maxLength={LIMITS.description}
          disabled={saving}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy("description", true)}
          onChange={(event) => update("description", event.target.value)}
        />
        <p id={fieldId("description-help")} className="tk-help-text">
          {values.description.length}/{LIMITS.description}
        </p>
        {fieldError("description")}
      </div>

      <div className="tk-form-group">
        <label className="tk-label" htmlFor={fieldId("result")}>
          Result{" "}
          {resultRequired ? (
            <span className="tk-required">(required)</span>
          ) : (
            <span className="tk-help-text">(optional while planned)</span>
          )}
        </label>
        <textarea
          id={fieldId("result")}
          className={`tk-textarea${errors.result ? " tk-textarea-invalid" : ""}`}
          rows={3}
          value={values.result}
          maxLength={LIMITS.result}
          disabled={saving}
          aria-invalid={Boolean(errors.result)}
          aria-describedby={describedBy("result", true)}
          onChange={(event) => update("result", event.target.value)}
        />
        <p id={fieldId("result-help")} className="tk-help-text">
          {values.result.length}/{LIMITS.result}
        </p>
        {fieldError("result")}
      </div>

      <div className="tk-form-group tk-action-checkbox">
        <input
          id={fieldId("followUpRequired")}
          type="checkbox"
          checked={values.followUpRequired}
          disabled={saving}
          onChange={(event) => {
            update("followUpRequired", event.target.checked);
            if (event.target.checked) {
              // Move focus to the field that has just become required.
              setTimeout(() => document.getElementById(fieldId("followUpNote"))?.focus());
            }
          }}
        />
        <label htmlFor={fieldId("followUpRequired")}>Follow-Up Required?</label>
      </div>

      {values.followUpRequired && (
        <div className="tk-form-group">
          <label className="tk-label" htmlFor={fieldId("followUpNote")}>
            Follow-up Note <span className="tk-required">(required)</span>
          </label>
          <textarea
            id={fieldId("followUpNote")}
            className={`tk-textarea${errors.followUpNote ? " tk-textarea-invalid" : ""}`}
            rows={2}
            value={values.followUpNote}
            maxLength={LIMITS.followUpNote}
            disabled={saving}
            aria-invalid={Boolean(errors.followUpNote)}
            aria-describedby={describedBy("followUpNote", true)}
            onChange={(event) => update("followUpNote", event.target.value)}
          />
          <p id={fieldId("followUpNote-help")} className="tk-help-text">
            {values.followUpNote.length}/{LIMITS.followUpNote}
          </p>
          {fieldError("followUpNote")}
        </div>
      )}

      <div className="tk-form-group">
        <label className="tk-label" htmlFor={fieldId("attachmentNotes")}>
          Attachment Notes
        </label>
        <input
          id={fieldId("attachmentNotes")}
          className={`tk-input${errors.attachmentNotes ? " tk-input-invalid" : ""}`}
          value={values.attachmentNotes}
          maxLength={LIMITS.attachmentNotes}
          disabled={saving}
          aria-invalid={Boolean(errors.attachmentNotes)}
          aria-describedby={describedBy("attachmentNotes", true)}
          onChange={(event) => update("attachmentNotes", event.target.value)}
        />
        <p id={fieldId("attachmentNotes-help")} className="tk-help-text">
          Which file in Attachments to look at (optional).
        </p>
        {fieldError("attachmentNotes")}
      </div>

      <div className="tk-button-row">
        <button type="submit" className="tk-button tk-button-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Action"}
        </button>
        <button
          type="button"
          className="tk-button tk-button-secondary"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ============================================================
// View panel
// ============================================================

function ActionDetail({
  action,
  mode,
  ticketLocked,
  busy,
  onEdit,
  onComplete,
  onCancelAction,
  onClose,
}: {
  action: ActionTaken;
  mode: "staff" | "requester";
  ticketLocked: boolean;
  busy: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onCancelAction: () => void;
  onClose: () => void;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const canEdit = mode === "staff" && action.canEdit && !ticketLocked;

  return (
    <section className="tk-action-detail" aria-label="Action Taken details">
      <dl className="tk-action-detail-grid">
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge status={action.status} />
          </dd>
        </div>
        <div>
          <dt>Action Date/Time</dt>
          <dd>{formatDate(action.actionAt)}</dd>
        </div>
        <div>
          <dt>Performed by</dt>
          <dd>{action.performedBy.name}</dd>
        </div>
        <div>
          <dt>Assignee</dt>
          <dd>{action.assignee?.name ?? "No assignee"}</dd>
        </div>
        <div className="tk-action-detail-wide">
          <dt>Action Description</dt>
          <dd className="tk-preserve-lines">{action.description}</dd>
        </div>
        <div className="tk-action-detail-wide">
          <dt>Result</dt>
          <dd className="tk-preserve-lines">{action.result ?? "Not recorded yet"}</dd>
        </div>
        <div>
          <dt>Follow-Up Required?</dt>
          <dd>
            <FollowUpBadge action={action} />
          </dd>
        </div>
        {action.followUpRequired && (
          <div className="tk-action-detail-wide">
            <dt>Follow-up Note</dt>
            <dd className="tk-preserve-lines">{action.followUpNote}</dd>
          </div>
        )}
        <div className="tk-action-detail-wide">
          <dt>Attachment Notes</dt>
          <dd>{action.attachmentNotes ?? "None"}</dd>
        </div>
        {action.completedAt && (
          <div>
            <dt>Completed</dt>
            <dd>{formatDate(action.completedAt)}</dd>
          </div>
        )}
        <div>
          <dt>Recorded</dt>
          <dd>{formatDate(action.createdAt)}</dd>
        </div>
        {action.updatedBy && (
          <div>
            <dt>Last edited</dt>
            <dd>
              {action.updatedBy.name}, {formatDate(action.updatedAt)}
            </dd>
          </div>
        )}
      </dl>

      {confirmingCancel ? (
        <div className="tk-alert tk-alert-warning" role="alert">
          <p>Cancel this planned action? Cancelled actions cannot be edited.</p>
          <div className="tk-button-row">
            <button
              type="button"
              className="tk-button tk-button-danger"
              disabled={busy}
              onClick={onCancelAction}
            >
              {busy ? "Cancelling..." : "Yes, cancel action"}
            </button>
            <button
              type="button"
              className="tk-button tk-button-secondary"
              disabled={busy}
              onClick={() => setConfirmingCancel(false)}
            >
              Keep action
            </button>
          </div>
        </div>
      ) : (
        <div className="tk-button-row">
          {canEdit && (
            <button type="button" className="tk-button tk-button-primary" onClick={onEdit}>
              Edit
            </button>
          )}
          {canEdit && action.status === "PLANNED" && (
            <>
              <button
                type="button"
                className="tk-button tk-button-secondary"
                onClick={onComplete}
              >
                Mark Completed
              </button>
              <button
                type="button"
                className="tk-button tk-button-secondary"
                onClick={() => setConfirmingCancel(true)}
              >
                Cancel Action
              </button>
            </>
          )}
          <button type="button" className="tk-button tk-button-tertiary" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </section>
  );
}

// ============================================================
// Section
// ============================================================

export default function ActionsTaken({
  ticketId,
  mode,
  ticketStatus,
  currentUser,
  staffMembers = [],
  onChanged,
}: ActionsTakenProps) {
  const headingId = useId();
  const [items, setItems] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>({ kind: "list" });
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const ticketLocked = LOCKED_TICKET_STATUSES.includes(ticketStatus);
  const isStaff = mode === "staff";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      setItems(
        isStaff
          ? await listStaffActionsTaken(ticketId)
          : await listRequesterActionsTaken(ticketId)
      );
    } catch (error) {
      setLoadError(errorMessage(error, "Actions Taken could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [isStaff, ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected =
    view.kind === "view" || view.kind === "edit"
      ? (items.find((item) => item.id === view.id) ?? null)
      : null;

  const latestId = items.length > 0 ? items[items.length - 1].id : null;

  function replaceItem(action: ActionTaken) {
    setItems((current) =>
      current.map((item) => (item.id === action.id ? action : item))
    );
  }

  async function handleCreate(fields: ActionTakenFields, clientRequestId: string) {
    await createActionTaken(ticketId, fields, clientRequestId);
    setNotice("Action recorded.");
    setView({ kind: "list" });
    await load();
    onChanged?.();
  }

  async function handleEdit(action: ActionTaken, fields: ActionTakenFields) {
    const updated = await updateActionTaken(ticketId, action.id, action.version ?? 1, fields);
    replaceItem(updated);
    setNotice("Action updated.");
    setView({ kind: "view", id: updated.id });
    onChanged?.();
  }

  async function reloadAction(actionId: number): Promise<ActionTaken | null> {
    const latest = await getStaffActionTaken(ticketId, actionId);
    replaceItem(latest);
    return latest;
  }

  async function cancelAction(action: ActionTaken) {
    setBusy(true);
    setActionError("");

    try {
      const updated = await updateActionTaken(ticketId, action.id, action.version ?? 1, {
        status: "CANCELLED",
      });
      replaceItem(updated);
      setNotice("Action cancelled.");
      onChanged?.();
    } catch (error) {
      setActionError(errorMessage(error, "The action could not be cancelled."));
    } finally {
      setBusy(false);
    }
  }

  function open(next: View) {
    setNotice("");
    setActionError("");
    setView(next);
  }

  return (
    <section className="tk-card tk-actions-taken" aria-labelledby={headingId}>
      <div className="tk-card-body">
        <div className="tk-actions-taken-header">
          <h2 id={headingId} className="tk-card-title">
            Actions Taken ({items.length})
          </h2>

          {isStaff && !ticketLocked && view.kind !== "create" && (
            <button
              type="button"
              className="tk-button tk-button-primary"
              onClick={() => open({ kind: "create" })}
            >
              Add Action
            </button>
          )}
        </div>

        {isStaff && ticketLocked && (
          <p className="tk-help-text">
            This Ticket is closed or cancelled; Actions Taken are read-only.
          </p>
        )}

        {notice && (
          <div className="tk-alert tk-alert-success" role="status">
            {notice}
          </div>
        )}

        {actionError && (
          <div className="tk-alert tk-alert-error" role="alert">
            {actionError}
          </div>
        )}

        {view.kind === "create" && (
          <ActionTakenForm
            action={null}
            currentUser={currentUser}
            staffMembers={staffMembers}
            onSubmit={handleCreate}
            onCancel={() => open({ kind: "list" })}
          />
        )}

        {loading && items.length === 0 ? (
          <div className="tk-state" role="status">
            <span className="tk-spinner" aria-hidden="true" />
            Loading Actions Taken...
          </div>
        ) : loadError ? (
          <div className="tk-alert tk-alert-error">
            <p>{loadError}</p>
            <button
              type="button"
              className="tk-button tk-button-secondary tk-button-sm"
              onClick={() => void load()}
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="tk-actions-empty">
            {isStaff
              ? "No actions recorded yet. Record the work performed to enable resolution."
              : "IT Staff have not recorded any actions yet."}
          </p>
        ) : (
          <div className="tk-actions-table-wrapper">
            <table className="tk-actions-table">
              <caption className="visually-hidden">
                Actions Taken, oldest first
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date/Time</th>
                  <th scope="col">Description</th>
                  <th scope="col">Result</th>
                  <th scope="col">Performed by</th>
                  <th scope="col">Status</th>
                  <th scope="col">Follow-up</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((action) => (
                  <tr
                    key={action.id}
                    className={selected?.id === action.id ? "tk-row-selected" : undefined}
                  >
                    <td data-label="Date/Time">
                      {formatDate(action.actionAt)}
                      {action.id === latestId && (
                        <span className="tk-badge tk-badge-neutral tk-latest">Latest</span>
                      )}
                    </td>
                    <td data-label="Description">
                      <span className="tk-clamp">{action.description}</span>
                    </td>
                    <td data-label="Result">
                      <span className="tk-clamp">{action.result ?? "—"}</span>
                    </td>
                    <td data-label="Performed by">{action.performedBy.name}</td>
                    <td data-label="Status">
                      <StatusBadge status={action.status} />
                    </td>
                    <td data-label="Follow-up">
                      <FollowUpBadge action={action} />
                    </td>
                    <td data-label="">
                      <button
                        type="button"
                        className="tk-button tk-button-secondary tk-button-sm"
                        aria-label={`View action from ${formatDate(action.actionAt)}`}
                        onClick={() => open({ kind: "view", id: action.id })}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view.kind === "view" && selected && (
          <ActionDetail
            action={selected}
            mode={mode}
            ticketLocked={ticketLocked}
            busy={busy}
            onEdit={() => open({ kind: "edit", id: selected.id })}
            onComplete={() =>
              open({ kind: "edit", id: selected.id, presetStatus: "COMPLETED" })
            }
            onCancelAction={() => void cancelAction(selected)}
            onClose={() => open({ kind: "list" })}
          />
        )}

        {view.kind === "edit" && selected && (
          <ActionTakenForm
            key={`${selected.id}-${view.presetStatus ?? ""}`}
            action={selected}
            presetStatus={view.presetStatus}
            currentUser={currentUser}
            staffMembers={staffMembers}
            onSubmit={(fields) => handleEdit(selected, fields)}
            onCancel={() => open({ kind: "view", id: selected.id })}
            onReloadLatest={() => reloadAction(selected.id)}
          />
        )}
      </div>
    </section>
  );
}
