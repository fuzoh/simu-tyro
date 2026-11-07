# Changelog

## [1.0.1](https://github.com/fuzoh/simu-tyro/compare/v1.0.0...v1.0.1) (2026-11-07)


### Bug Fixes

* **persist:** gate the address bar on `publishable` and write a bare / on oversize ([9ed97e4](https://github.com/fuzoh/simu-tyro/commit/9ed97e4896b979f5b9c742edcd9a13cec8302285))
* **persist:** publish a bare / when the trace exceeds the link budget ([930398c](https://github.com/fuzoh/simu-tyro/commit/930398c94933c5d8abd00b3f7910da29680f6e68))
* **rail:** gate a knot on HMPE with the passer-a-la-terminaison-de-depart Fix Action ([62d08b0](https://github.com/fuzoh/simu-tyro/commit/62d08b005e7c81f311dd9416a971f3fe8f16a5d0))
* **rail:** keep an emptied View Strip x field from sending the rider to 0 m ([87480f3](https://github.com/fuzoh/simu-tyro/commit/87480f3c2ae09d15313a1d14fd2d05150a2251da))
* **rail:** keep the gate report and results through an x_D scrub ([893bdea](https://github.com/fuzoh/simu-tyro/commit/893bdea1e4abce13fe16b4d8dd274c821c8420d9))
* **rail:** key the report and results memos on traverseInputs ([8b83d4f](https://github.com/fuzoh/simu-tyro/commit/8b83d4f30f4bc7176f1a5ed1e1b7474160225b3f))
* **rail:** key useDeduced on rider.mp and unit, useResults on hClearMin ([0884f66](https://github.com/fuzoh/simu-tyro/commit/0884f661cf6cc1bd2fd6ffbd3302c5557762b312))
* **rail:** list every read field in the deduced and results memos ([e16a7e9](https://github.com/fuzoh/simu-tyro/commit/e16a7e9e0f4a220b80d5c76ca458292d29a023d5))
* **rail:** name every missed clause in the régime-unavailable error ([aeb8b06](https://github.com/fuzoh/simu-tyro/commit/aeb8b06b991e3d720725f1498e134149f9f51328))
* **rail:** raise an end the line cannot use as a Verdict-gate blocking error ([c4a3331](https://github.com/fuzoh/simu-tyro/commit/c4a3331c82cc59745a7b21125a3cb35aa3427ada))
* **rail:** read and write every numeric field through FIELD_ACCESS ([8ac09c4](https://github.com/fuzoh/simu-tyro/commit/8ac09c4ea903563045375515c2eb1c77eb0bc914))
* **rail:** read and write every numeric field through one lens ([7f4133d](https://github.com/fuzoh/simu-tyro/commit/7f4133d9b9cf800448a11ce5a79f97e78cba714e)), closes [#25](https://github.com/fuzoh/simu-tyro/issues/25)
* **rail:** stop an emptied View Strip x field from sending the rider to 0 m ([acb8ea0](https://github.com/fuzoh/simu-tyro/commit/acb8ea035c2ddf8bdb7de6f6277c128596cbcba1))
* **url:** apply the review round to the codec move ([53bd7e5](https://github.com/fuzoh/simu-tyro/commit/53bd7e57b6ea3ae156def06e6e0da910326007b9))
* **url:** complete a missing η from the decoded end and a missing k from its class ([401a110](https://github.com/fuzoh/simu-tyro/commit/401a1101da72272d5eba5df5061a8d6d3a3ea137))
* **url:** complete from the active family and drop the decoder's fallbacks ([de426a0](https://github.com/fuzoh/simu-tyro/commit/de426a0181f841269e102916c2d267e1a535075d))
* **url:** complete links into a CompletedSearch from the active family ([a6d7d8a](https://github.com/fuzoh/simu-tyro/commit/a6d7d8aed7131894fa1d61fa34a7ee737d096ed2))
* **url:** derive cls and cst tokens from ROPE_CLASS_TOKEN_BY_ID and CONSTRUCTION_TOKEN_BY_ID ([57cfbf6](https://github.com/fuzoh/simu-tyro/commit/57cfbf6fe157859346b9982889be35e75eeb3936))
* **url:** derive cls and cst tokens from total tables and name a completed rope class ([009605e](https://github.com/fuzoh/simu-tyro/commit/009605efd2b3d8c2566d5904c00a7f22830aab6c))
* **url:** make the link strip's key table total and derive ValidatedSearch ([7cf3c83](https://github.com/fuzoh/simu-tyro/commit/7cf3c83c96a163dc85d65776d23ffa8ef0e1536a))
* **url:** make the link strip's KEYS total and derive ValidatedSearch ([95d21c5](https://github.com/fuzoh/simu-tyro/commit/95d21c58e07bf1e07b25a1ab5af245e71136fa8d))


### Tests

* **url:** pin golden canonical links for every encoding branch ([b6befe1](https://github.com/fuzoh/simu-tyro/commit/b6befe1de128001db9096a14128dcf12342248ad))
* **url:** pin golden canonical links for every encoding branch ([d43182c](https://github.com/fuzoh/simu-tyro/commit/d43182c403316e0ddc56857813052e65cf8cfcec))


### Documentation

* add ADR-0001 on faithful invalid state and blocking gates ([e74d4e9](https://github.com/fuzoh/simu-tyro/commit/e74d4e923abfc93295305e5b1271b2176dcdf978))
* add ADR-0001 on faithful invalid state and blocking gates ([0c50f5f](https://github.com/fuzoh/simu-tyro/commit/0c50f5f4905ee82c73aac87b22133c588ec661a1))


### Refactors

* **rail:** move deduced rows, read-out cells and option labels out of JSX ([5ef8782](https://github.com/fuzoh/simu-tyro/commit/5ef87822fb99d77f83e221aa476637571e4a0dfd))
* **rail:** move deducedRows, readOutCells and option labels out of JSX ([a8467f8](https://github.com/fuzoh/simu-tyro/commit/a8467f89b4060bd066125e7842afa64bade58428))
* **scenario:** derive the unloaded line once for deduced values and scene ([7f7afd8](https://github.com/fuzoh/simu-tyro/commit/7f7afd8fd22c04f9dca3c2cf3a206e5602c6a102))
* **scenario:** derive the unloaded line once with deriveUnloaded ([4cc11c5](https://github.com/fuzoh/simu-tyro/commit/4cc11c52ffdc7ac8ba1172b3feea1509cf6e4d03))
* **sim:** own the warning thresholds in lineWarnings, the copy in the app ([fdcfc4f](https://github.com/fuzoh/simu-tyro/commit/fdcfc4ff97dd1b6e7fe256cd8f68cbcb5c1c432f))
* **sim:** own the warning thresholds in the engine, the copy in the app ([02b450a](https://github.com/fuzoh/simu-tyro/commit/02b450a32cbf252e814eb1fb1e07de092424aea5))
* **url:** move the search decoder next to the encoder ([a4cee05](https://github.com/fuzoh/simu-tyro/commit/a4cee05d0ce608158a863e7470756e12b6414ad6))

## 1.0.0 (2026-11-06)


### Features

* build profile view prototype to settle v1 chart design ([2612898](https://github.com/fuzoh/simu-tyro/commit/2612898ba00c0ebb48074bd04aee74cd89ffbf85))
* **build:** ship the app as static files under a configurable base path ([427caa3](https://github.com/fuzoh/simu-tyro/commit/427caa30dd001899e716207b3ad83bbaa5ce6d6c))
* **chart:** add trajectory and rider distance layers ([ef8618d](https://github.com/fuzoh/simu-tyro/commit/ef8618deb7177191f104c7679d9e51e6c330d81b))
* **docs:** serve theory pages and link help copy ([3bd91bd](https://github.com/fuzoh/simu-tyro/commit/3bd91bd00834d370d39080a894e4cfa23e8f111e))
* initial commit ([f4f3c32](https://github.com/fuzoh/simu-tyro/commit/f4f3c32e033be9085829f40c653f44a213a3ebf0))
* **layout:** collapse chart block into pinned safety header ([af38e00](https://github.com/fuzoh/simu-tyro/commit/af38e004378287b09c2ba0b20f2eb3f061f1cfb3))
* **rail:** add help tooltips and clearance check ([d7d374c](https://github.com/fuzoh/simu-tyro/commit/d7d374cfdba9e75bd9758acf8f0616af4be601f9))
* **rail:** add P/H ratio tightness driver ([3a5d74b](https://github.com/fuzoh/simu-tyro/commit/3a5d74b2239c29bcd1011741b4f2a5b35e4f6f90))
* **rail:** allow tightness mode switch during no-result states ([7529659](https://github.com/fuzoh/simu-tyro/commit/752965907296c75b09a86ae6215fb22d64b0cf38))
* **shell:** cap and centre the app past 1728 px instead of stretching edge-to-edge ([5b1a8ba](https://github.com/fuzoh/simu-tyro/commit/5b1a8ba37b5293e5284203eb6170f45c049f5159))


### Bug Fixes

* **chart:** correct three claims the review measured wrong ([5f19718](https://github.com/fuzoh/simu-tyro/commit/5f197189f276323f137247093e5d288a3d1bfd44))
* **chart:** distinguish line clearance from rider clearance ([613b849](https://github.com/fuzoh/simu-tyro/commit/613b849da819bd70b5092fd6020bd55401c4e990))
* **chart:** scope label switches on what clears « Flèche », not on B1 ([dd118d7](https://github.com/fuzoh/simu-tyro/commit/dd118d706536b600092a0fed0c248dfcee9e432b))
* **docs,test:** retake two figures ticket 37 superseded ([352e9ed](https://github.com/fuzoh/simu-tyro/commit/352e9edd8c3ba4fbd9b880b17198d3634456f2a0))
* **rail:** avoid cascading renders in ClampNote ([241b56e](https://github.com/fuzoh/simu-tyro/commit/241b56e9ec1adcbb099bc3b44795c721e14fdcf9))
* **rail:** give the provenance chip its own line so it stops painting over the field label ([d352aac](https://github.com/fuzoh/simu-tyro/commit/d352aac6523a7a146894d621733eb886905f91b4))
* **sim:** evaluate the rider node in §11's clearance scan ([e4238c7](https://github.com/fuzoh/simu-tyro/commit/e4238c765401fc1058a5ee3ee29ef8b140ea1243))
* **sim:** make §11's merged sample order true, and restore the tripwire figure ([a75c753](https://github.com/fuzoh/simu-tyro/commit/a75c7532242f52e00e0d589fc3caf9203944c12a))
* **sim:** re-take defect 1's deltas against the old scan, not its record ([d1fbd29](https://github.com/fuzoh/simu-tyro/commit/d1fbd29d7dfef0160438c4dcf86c2b44323298c1))
* **sim:** read §6.1 one way in §5.2's Peyrot–Goulois seed ([aed1f7e](https://github.com/fuzoh/simu-tyro/commit/aed1f7ef93c30bd8e7450367cee81a9bfdf2b396))
* **terrain:** re-record the garde figures the app discloses to the user ([937bc1d](https://github.com/fuzoh/simu-tyro/commit/937bc1dabfe499331e00af45998754a2736a5d22))


### Performance Improvements

* **ui:** preload fonts and restrict tailwind source ([d206215](https://github.com/fuzoh/simu-tyro/commit/d206215d94de4b96ab02cf3953923995877b5506))


### Tests

* assert §13.1's own digits, and stop claiming regimeK is a §3 row ([630a490](https://github.com/fuzoh/simu-tyro/commit/630a49051007d1b7a97d922dbd4c34639f4db55d))
* **bench:** port benches to the vitest 5 bench fixture ([36dd154](https://github.com/fuzoh/simu-tyro/commit/36dd154e825237d1bf5098232993c9008e636c44))
* **chart:** judge the strip's curve against a ten-times-finer scan ([e9cc267](https://github.com/fuzoh/simu-tyro/commit/e9cc267b586118a5817f306e03588301d3015c64))
* **sim:** check the tension scan against a second way of taking it ([3b34aa7](https://github.com/fuzoh/simu-tyro/commit/3b34aa7df1f2d8005239ecd80be07198a83f84cf))
* **sim:** decide §4.3's near-taut guard — stretched side, no slack twin ([ce8b8f7](https://github.com/fuzoh/simu-tyro/commit/ce8b8f7f7f7c41944f4ebd15787c0fd0b623a65d))
* **sim:** pin the shared tension scan on its own terms ([e78dd11](https://github.com/fuzoh/simu-tyro/commit/e78dd11be9a0286d9793ba483b5dde3710a8dbf6))


### Documentation

* add agent skill documentation for domain docs and triage labels ([65a3f2f](https://github.com/fuzoh/simu-tyro/commit/65a3f2ffaf0021035a2ae6fa33fd79d8385a226d))
* app features spec ([5c09235](https://github.com/fuzoh/simu-tyro/commit/5c09235a59035737e4d09c1b24196125bb7a10b3))
* **chart:** retire the scan-error claims ticket 37 closed ([0161992](https://github.com/fuzoh/simu-tyro/commit/016199242d553ddc539b5c2ae1019a7e6e763d6d))
* **contributing:** describe post-1.0 version bumps and Release-As ([0f31ab4](https://github.com/fuzoh/simu-tyro/commit/0f31ab48ed4f8ebff38b77e474e232713234b7d5))
* correct the Pages base path to /simu-tyro/ ([e40003c](https://github.com/fuzoh/simu-tyro/commit/e40003c0e702c1d257efcd2bccd47a95ad2dfc33))
* drop CLAUDE.md, split AGENTS.md and CONTRIBUTING.md, ban tautological tests ([b94396d](https://github.com/fuzoh/simu-tyro/commit/b94396d1b09ad1c48cf44c4eede60651478a4aa3))
* feature spec ([bdf7515](https://github.com/fuzoh/simu-tyro/commit/bdf7515d706b95399d05c6d0e4fb82cdc363d2c0))
* new tickets refinements ([5905dd8](https://github.com/fuzoh/simu-tyro/commit/5905dd83ba6fa8f05080e68124c2a004aefca4a3))
* refine agents.md ([1683c9b](https://github.com/fuzoh/simu-tyro/commit/1683c9b9793e0296074381ea250223ff1ca930da))
* rewrite README, add CONTRIBUTING and update AGENTS.md ([4c6b2c0](https://github.com/fuzoh/simu-tyro/commit/4c6b2c02608d3a874882a0075a549d9b1967b75b))
* **scenario:** name the geometry-mode branch and its fifth-branch trigger ([c9de4e3](https://github.com/fuzoh/simu-tyro/commit/c9de4e3195d7fc21f2a1e52a84de649a30b06e84))
* setup matt skills ([16daf6f](https://github.com/fuzoh/simu-tyro/commit/16daf6f78317d24b57d6629b417a03ba5aff59c8))
* **sim:** say that §11's atX is a scanned vertex, not an argmin ([b7bc771](https://github.com/fuzoh/simu-tyro/commit/b7bc7715fa5e1c3d08d9abab353536d0f5503431))
* spec finalization ([e8a01ad](https://github.com/fuzoh/simu-tyro/commit/e8a01adf279cd35bb70146e12d85aa8aab3b2b5c))
* **theory:** demote §13.1's 6 mm 6×19 triple to [UNVERIFIED:R2] ([3b23cbe](https://github.com/fuzoh/simu-tyro/commit/3b23cbe1eec0bf4853cfef92f1ada6868a3cc761))
* **tickets:** add amendment N and resolve ticket 31 review question ([f9bbb8b](https://github.com/fuzoh/simu-tyro/commit/f9bbb8b3143389b7953ff70fdfc264a789aa4876))
* **tickets:** close 37 with the measured re-takes ([0194631](https://github.com/fuzoh/simu-tyro/commit/01946313d34f44679808edae3df13d1fa04df465))
* **tickets:** close 38 — two done, one declined, one deferred, one verified ([87e78b5](https://github.com/fuzoh/simu-tyro/commit/87e78b57ab30c28e59478b073d323607a9ab9477))
* **tickets:** close 39 item 5 — the noise is gone, the position is documented ([189a37d](https://github.com/fuzoh/simu-tyro/commit/189a37dbdb6c9221fd5b693cb9cbdd79324482f1))
* **tickets:** document amendments H through N in build README ([5d6c4fb](https://github.com/fuzoh/simu-tyro/commit/5d6c4fb8dfa4a7d1c1a0b2f80eeff029c062357a))
* **tickets:** open 42–46 from the second algorithmic review ([41dec5b](https://github.com/fuzoh/simu-tyro/commit/41dec5b3b6e56b38321363c6d8e8e0731acf4c91))
* **tickets:** record the review on 37, and untick the toFixed box ([560f890](https://github.com/fuzoh/simu-tyro/commit/560f890767d3532b38d03a403bd8c49231cca94d))
* wayfinder grill ([696df0b](https://github.com/fuzoh/simu-tyro/commit/696df0b93e8bd24ab634a98e962e2e46e836d331))


### Refactors

* **chart:** quantise clearance strip y domain and interpolate holes ([56049ab](https://github.com/fuzoh/simu-tyro/commit/56049ab19f9de69404211b1fd3c61165c7b82076))
* **format:** give the régime divisor its own QuantityId ([459f490](https://github.com/fuzoh/simu-tyro/commit/459f49020d9cbe9f954d5b3aa92e77a1223da3bb))
* **scenario:** give the span a geometry describes one owner ([65ff1f6](https://github.com/fuzoh/simu-tyro/commit/65ff1f684f4d46993fb5f35470eca4485a660da3))
* **sim:** give the worst-tension-per-end scan one owner ([2dd0c77](https://github.com/fuzoh/simu-tyro/commit/2dd0c77294128ec8b888afc8a3e99caf1767842f))
* **strip:** revert ClearanceStrip curve to passenger clearance ([9909766](https://github.com/fuzoh/simu-tyro/commit/9909766f5f3aca0cee103aa0adedb1917699dc86))
* **ui:** unify control density, typography, and tokens ([815d2d8](https://github.com/fuzoh/simu-tyro/commit/815d2d8aa6bdb9d0ca44c122de747dd53f01ec62))


### Miscellaneous Chores

* **agents:** move issue tracker to GitHub, rename glossary ([46e93db](https://github.com/fuzoh/simu-tyro/commit/46e93db9a135b01b58d684a2d82186bf6d70dbba))
* app v1 ([6dfdd5d](https://github.com/fuzoh/simu-tyro/commit/6dfdd5d34fb8651169192d0d5d5f35d8194f112a))
* **build:** remove unused eslint and prettier ([22c2000](https://github.com/fuzoh/simu-tyro/commit/22c2000965ca8d731b2e4f088427e74e92ec4ede))
* **build:** update project dependencies and tooling ([939b2eb](https://github.com/fuzoh/simu-tyro/commit/939b2ebb14cd47a988745edcb84c69c6303ae1ce))
* finalize spec ([9434f86](https://github.com/fuzoh/simu-tyro/commit/9434f8643f3c4829cc66c1012eae92c20fe3bc6c))
* oxlint and oxfmt ([728d76a](https://github.com/fuzoh/simu-tyro/commit/728d76af990c1549107725dd407eaeed98298d88))
* research references for zipline simulation ([f0004f2](https://github.com/fuzoh/simu-tyro/commit/f0004f2fa9285e086aab0df40a8e60fa23ee868e))
* resources for simulator ([56439cd](https://github.com/fuzoh/simu-tyro/commit/56439cd8d7971db14093063f27b004ac65cdfc9b))
* retire profile prototype and settle v1 amendments ([385ff02](https://github.com/fuzoh/simu-tyro/commit/385ff027207735af7a091ddcb50ba55e3356e97d))


### Build System

* **deps:** apply dependabot updates [#18](https://github.com/fuzoh/simu-tyro/issues/18)–[#21](https://github.com/fuzoh/simu-tyro/issues/21) and pin bun 1.4.4 ([59803f7](https://github.com/fuzoh/simu-tyro/commit/59803f7d46c048cd6859d45999eb6644a05a7969))


### Continuous Integration

* add CI checks, release-please and deploy Pages on release ([c30e1db](https://github.com/fuzoh/simu-tyro/commit/c30e1dbdb36585f68203baace73644337146c708))
* keep the p95 tripwire out of the deploy gate ([d0da74d](https://github.com/fuzoh/simu-tyro/commit/d0da74dcffcbad989c89e3d798e262c3d0625826))
* leave the release-please manifest out of oxfmt ([a17631d](https://github.com/fuzoh/simu-tyro/commit/a17631db4cf36f6336efd2bdf49921d80b02ecdd))
* publish to GitHub Pages on every push to main ([316f325](https://github.com/fuzoh/simu-tyro/commit/316f325f4e79eca31b1f8b0ec2d95b740490163b))
* upgrade deploy workflow actions ([6bc81e0](https://github.com/fuzoh/simu-tyro/commit/6bc81e084baa7cecec2aeb0475443b31ce4bb872))


### Reverts

* **sim:** ticket 37 defect 2 is a misdiagnosis — restore §5.2's seed ([7c99510](https://github.com/fuzoh/simu-tyro/commit/7c9951057000a81224d8dc4386caad37b7a173b0))
