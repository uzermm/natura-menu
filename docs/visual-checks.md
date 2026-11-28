# Design references

`tests/e2e/visual-baselines/` contains reviewed Windows/Edge image references at
390 px (mobile) and 1440 px (desktop). The **visual** workflow uses the same OS
and browser family to avoid treating Linux font differences as design changes.

Coverage: customer categories, cafe account summaries, online restaurant cards.
Existing browser tests separately cover POS, settings, roles, scrolling, print
spacing and two-page A4 overflow.

Run with `VISUAL_REGRESSION=1`, `PLAYWRIGHT_CHANNEL=msedge`, `ONLINE_BACKGROUND=0`.
After a production build, run `playwright test`. To accept an intentional change,
run with `--update-snapshots`, inspect the resulting images, and commit them with
the design change. Do not automatically update references in CI. Failures retain
the expected, actual and difference images as workflow artifacts.
