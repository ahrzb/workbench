# Fix

For tools built in this project, one tool at a time: say which one in your first line and read its `NOTES.md` (Careful, Things that work) and `CONTEXT.md` before anything else. Trouble with outside software goes out as a forwardable message ([safety.md](safety.md#forwardable-messages)).

## Data first

If data looks wrong or missing: stop building and protect what's there.
1. Back up the current data as it is to the tool's backups folder ([safety.md](safety.md#data)), labelled `before-restore` (`data-safety-cli.mjs backup before-restore` when the tool has the `data-safety` block). Never skip this; it may hold entries no backup has.
2. Find out whether the data is really wrong or only shown wrong (a display or filter problem leaves the data fine).
3. If it's really damaged: compare the newest backup with the current data and show the user, in their words, what a restore would bring back and what it would lose ("the 3 bills you added this morning would be gone").
4. Restore only with their OK, and selectively where you can (bring back only the missing or damaged entries). Then diagnose the cause.

Never trust your own claim about what is recoverable; look.

## Steps

1. **Three questions**, one per message: what did you expect, what happened, what were you doing just before? A screenshot is welcome.
2. **Reproduce it yourself.** Confirm in their words: "I see it too: when you do X, Y happens. Is that the problem?" Can't reproduce: ask for the file or the exact steps, or watch them do it once.
3. **Write a check that fails** because of the problem.
4. **Save point**, then fix. Make the failing check pass and run all checks.
5. **Check it yourself** the way they would, as the trying-out copy (`try.ts`, with approval); hidden checks and scripts are fine for you, but they don't count as the user seeing it.
6. **Save point** "<tool>: <their words for the fix>", update the tool's NOTES (Careful, Things that work).
7. **Let them try it** before anything replaces their copy: the trying-out copy open in front of them (`try.ts`), what to do to see the problem is gone, with their own example, and one line: "Does it work now? If yes, I'll make it the version on your desktop." Use the build hand-back shape ([build.md](build.md#3-the-loop-one-small-change-at-a-time)); "What I checked" names the check you added.
8. **Only after their yes: "Ship it"** ([stack.md](stack.md#in-use-and-trying-out)). Also when it's urgent: just be quick about it; never replace their copy unseen.

Error messages the user saw: translate in four lines: what happened (their words), why (one plain sentence), what you're doing, whether they need to do anything. Make clear the problem is the tool's, not theirs.

## Two-strike reset

After two failed attempts at the same problem, stop patching. Go back to the last good save point, restate the problem from what the user expected, and suggest continuing in a new chat. Offer a simpler alternative or a workaround while you rethink.
