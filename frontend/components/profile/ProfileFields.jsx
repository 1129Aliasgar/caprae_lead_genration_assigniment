"use client";

/**
 * The stored profile, one editable row per field.
 *
 * The extractor is a regex parser, so some of what it reads is wrong. Showing
 * the profile without letting anyone change it means the only remedy is
 * repasting a resume and hoping a different page reads differently — which is a
 * poor answer when the user can see exactly which field is wrong and can name
 * the right value in a second.
 *
 * Each row edits independently and PATCHes only its own key, so correcting one
 * field cannot disturb the others. The value shown after a save is the one the
 * server returned, never the local guess — if the two disagree, the server is
 * right and the screen must say so.
 */

import { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  HelpCircle,
  Pencil,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfile } from "@/lib/api";
import { toastError, toastSuccess } from "@/hooks/useToast";
import { EDUCATION_LEVELS, MAX_EDITED_LIST_ITEMS } from "@/lib/constants";
import { cn } from "cn";

/**
 * Per-field confidence, as shown next to each value.
 *
 * `high` reads as "we're sure of this", which after an edit means "you said so,
 * and we took it" — the backend promotes a corrected field to `high` for the
 * same reason.
 */
const CONFIDENCE = {
  high: { label: "High confidence", Icon: CheckCircle2, className: "text-score-high-text" },
  medium: { label: "Worth checking", Icon: AlertCircle, className: "text-score-mid-text" },
  low: { label: "Please check", Icon: HelpCircle, className: "text-destructive" },
};

/** Where a skill, title or location comes from when the API returns none. */
const NO_VALUE = "Nothing found";

/**
 * Split a textarea into a list.
 *
 * Newline and comma both count, because the UI accepts either and a paste that
 * brings commas in from elsewhere should not produce a single entry called
 * "aws, terraform". Blank entries are dropped for the same reason the API
 * rejects empty strings: a list of `["", "aws"]` halves the skill score without
 * changing what the user meant.
 */
function parseList(raw) {
  return raw
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function ConfidenceIcon({ level }) {
  const variant = CONFIDENCE[level] ?? CONFIDENCE.low;
  const { Icon } = variant;

  return (
    <Icon
      className={cn("size-3.5 shrink-0", variant.className)}
      aria-label={variant.label}
      role="img"
    />
  );
}

/**
 * One editable row.
 *
 * `renderEditor` is a function rather than a node so the input mounts fresh on
 * each edit — a controlled input seeded from a prop will keep its old value if
 * the same component instance is reused after a save.
 */
function EditableField({
  label,
  confidence,
  fieldKey,
  value,
  display,
  renderEditor,
  parse,
  onSaved,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setDraft(value ?? "");
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft("");
  };

  const save = async () => {
    const parsed = parse ? parse(draft) : draft;

    /*
     * `parse` returns undefined when there is nothing valid to send — the
     * education select produces that when the user opens it and closes it
     * without choosing. `JSON.stringify` drops an undefined key, so the request
     * would go out as `{}` and come back 400 "Provide at least one field to
     * update": an error for something the user did not actually ask to change.
     * Closing the editor is the honest outcome.
     */
    if (parsed === undefined) {
      setEditing(false);
      setDraft("");
      return;
    }

    /* An empty list is a legitimate edit — clearing skills is allowed. */
    if (!saving) {
      setSaving(true);

      try {
        const res = await updateProfile({ [fieldKey]: parsed });

        onSaved(res.data.profile);
        setEditing(false);
        setDraft("");
        toastSuccess(`${label} updated`);
      } catch (error) {
        toastError("Could not save", error.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const cancelDisabled = () => setEditing(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>

        {confidence ? <ConfidenceIcon level={confidence} /> : null}

        {editing ? null : (
          <button
            type="button"
            onClick={startEditing}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="size-3" aria-hidden="true" />
            Edit
            <span className="sr-only">{label}</span>
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {renderEditor(draft, setDraft)}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>

            <Button size="sm" variant="ghost" onClick={cancelDisabled} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        display(value)
      )}
    </div>
  );
}

/**
 * Textarea for a list field.
 *
 * A named component rather than a closure built inside `ProfileFields`: a
 * returned arrow function is a component to React, and an anonymous one trips
 * `react/display-name` — which is the lint rule correctly noticing a component
 * with no identity in the devtools tree.
 */
function ListEditor({ rows, draft, onDraftChange }) {
  return (
    <textarea
      rows={rows}
      value={draft}
      onChange={(event) => onDraftChange(event.target.value)}
      placeholder="One per line, or separated by commas"
      aria-label="Values, one per line"
      className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

/**
 * Read-only rendering of a list field.
 *
 * Takes `(value, maxShown)` rather than a props object, because `EditableField`
 * invokes `display(value)` — it passes the raw value down, not a wrapper. The
 * object form looks natural and silently passes `undefined` as `value`, which
 * then throws on destructure.
 */
function ListDisplay(value, maxShown = 12) {
  const items = Array.isArray(value) ? value : [];

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{NO_VALUE}</p>;
  }

  const shown = items.slice(0, maxShown);
  const hidden = items.length - shown.length;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((item) => (
        <li key={item}>
          <Badge variant="secondary" className="font-normal">
            {item}
          </Badge>
        </li>
      ))}

      {hidden > 0 ? (
        <li>
          <Badge variant="outline" className="font-normal text-muted-foreground">
            +{hidden} more
          </Badge>
        </li>
      ) : null}
    </ul>
  );
}

/**
 * Binds a row height to the shared `ListEditor`.
 *
 * `renderEditor` in `EditableField` is a function of `(draft, setDraft)` so each
 * field type can choose its own control. Wrapping it here is what lets the
 * editors stay plain JSX at the call site instead of every field re-implementing
 * the textarea.
 */
function listEditor(rows) {
  return function ListFieldEditor(draft, setDraft) {
    return <ListEditor rows={rows} draft={draft} onDraftChange={setDraft} />;
  };
}

export function ProfileFields({ profile, onSaved }) {
  if (!profile) return null;

  return (
    <div className="space-y-5">
      <EditableField
        label="Job titles"
        confidence={profile.confidence?.titles}
        fieldKey="titles"
        value={profile.titles}
        display={ListDisplay}
        renderEditor={listEditor(4)}
        parse={parseList}
        onSaved={onSaved}
      />

      <EditableField
        label="Skills"
        confidence={profile.confidence?.skills}
        fieldKey="skills"
        value={profile.skills}
        display={(value) => (
          <div className="space-y-2">
            <ListDisplay value />

            {/*
              Skill overlap is scored as a fraction of these skills found in a
              posting, so the list length changes every score. Worth saying where
              the edit happens rather than only in the docs.
            */}
            {Array.isArray(value) && value.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Every lead is scored on how many of these it mentions, so a longer
                list lowers the percentage on each one. Keep it to what you
                actually want to be matched on.
                {MAX_EDITED_LIST_ITEMS ? ` Up to ${MAX_EDITED_LIST_ITEMS}.` : ""}
              </p>
            ) : null}
          </div>
        )}
        renderEditor={listEditor(6)}
        parse={parseList}
        onSaved={onSaved}
      />

      <EditableField
        label="Locations"
        confidence={profile.confidence?.titles}
        fieldKey="locations"
        value={profile.locations}
        display={ListDisplay}
        renderEditor={listEditor(3)}
        parse={parseList}
        onSaved={onSaved}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <EditableField
          label="Years of experience"
          confidence={profile.confidence?.yearsOfExperience}
          fieldKey="yearsOfExperience"
          value={profile.yearsOfExperience ?? ""}
          display={(value) => (
            <p className="text-sm">{value || "—"}</p>
          )}
          renderEditor={(draft, setDraft) => (
            <>
              <input
                type="number"
                min="0"
                max="45"
                step="0.5"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-label="Years of experience"
                className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />

              {/*
                The floor is derived from this number, so editing it can change
                which leads appear at all — not just their order.
              */}
              <p className="text-xs text-muted-foreground">
                This sets the salary floor your leads are filtered against, so
                changing it can change the list, not just the scores.
              </p>
            </>
          )}
          parse={(draft) => Number(draft)}
          onSaved={onSaved}
        />

        <EditableField
          label="Education"
          confidence={profile.confidence?.educationLevel}
          fieldKey="educationLevel"
          value={profile.educationLevel ?? ""}
          display={(value) => <p className="text-sm">{value || "—"}</p>}
          renderEditor={(draft, setDraft) => (
            <Select value={draft} onValueChange={setDraft}>
              <SelectTrigger aria-label="Education level" className="w-full">
                <SelectValue placeholder="Not stated" />
              </SelectTrigger>

              <SelectContent>
                {EDUCATION_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          parse={(draft) => draft || undefined}
          onSaved={onSaved}
        />
      </div>

      {profile.summary ? (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Summary</Label>
          <p className="text-sm text-muted-foreground">{profile.summary}</p>
          <p className="text-xs text-muted-foreground">
            Read from your resume and not used for matching, so it is not editable.
          </p>
        </div>
      ) : null}
    </div>
  );
}