# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 0.2.0 (2026-01-24)

### Bug Fixes

- derive subnet ports from boundary nodes for automatic sync at any level ([4d7c15f](https://github.com/constructive-io/fbp/commit/4d7c15fe9f4cd32c85e4312358aa4b0b3c0f2bdf))
- edge preview in subgraphs and boundary node sync with parent subnet ([891cc45](https://github.com/constructive-io/fbp/commit/891cc45aafb9da90f7d47744c1ad4ae08d369697))
- evaluation now works inside subgraphs using scoped graph ([16aa4e6](https://github.com/constructive-io/fbp/commit/16aa4e6a4d5470a6d4be9522e3a5300a4314e56b))
- make all reducer actions scope-aware for subnet navigation ([051e7a8](https://github.com/constructive-io/fbp/commit/051e7a85be0b657dba9a4e24b68811fc07640dc6))
- move React hooks to top of PropertiesPanel to fix hooks order error ([24da1d3](https://github.com/constructive-io/fbp/commit/24da1d36df85049766a9de6ba7f72c10d3d83274))
- PropertiesPanel now uses scoped nodes for subnet context ([0331374](https://github.com/constructive-io/fbp/commit/03313746b2eda43988aaa188d224551e61e8bb0b))
- refresh button now uses live graph state, add default value for graphInput ([1dd7228](https://github.com/constructive-io/fbp/commit/1dd7228fa4376d4a3571ea287ba6b2d19f8bc975))
- subnet navigation now renders internal nodes when diving in ([83b99dc](https://github.com/constructive-io/fbp/commit/83b99dc1f7acaa104ed94148c70e1d29c6213981))

### Features

- add @fbp/graph-editor package, remove litegraph ([7062610](https://github.com/constructive-io/fbp/commit/70626102c71a1db963cebe68b1abacfe1c6222a8))
- add autolayout for subnet nodes - arranges nodes in layers by dependency ([46d7c31](https://github.com/constructive-io/fbp/commit/46d7c31124b3ec78e39dbeff6849a6b511572049))
- add boundary nodes with auto-naming and async evaluation ([075795d](https://github.com/constructive-io/fbp/commit/075795db4c866d2ae21003f6e6bc0deda6c8a3b9))
- add copy/paste for groups (Cmd+C/V) and allow 1+ node collapse ([6182ac2](https://github.com/constructive-io/fbp/commit/6182ac2d946aafe8793764bc52a5988f4aa22e6d))
- add editable boundary node names and drag-and-drop from palette ([1030db2](https://github.com/constructive-io/fbp/commit/1030db2b80789502aaa185b5ec535d10d78cb622))
- add GraphOutput nodes with evaluation result display ([351e82b](https://github.com/constructive-io/fbp/commit/351e82b25b590e9e3990ccbf7edcabe548aa968e))
- add icons to all node definitions and display in UI ([bfb0c46](https://github.com/constructive-io/fbp/commit/bfb0c4645ce5ae9415d57fcf79c8cf51e8abf77d))
- add L hotkey to autolayout selected nodes ([4295ed6](https://github.com/constructive-io/fbp/commit/4295ed60477b5846becf9927c4c9c4f1a3f03f7c))
- add proper UI frame with header, node palette sidebar, and status bar ([9713b2a](https://github.com/constructive-io/fbp/commit/9713b2a31a3df9db75ee6cbbd5d39e56adf5f9d7))
- add react-icons SVG icons and GraphQL login example ([02a493d](https://github.com/constructive-io/fbp/commit/02a493da93f0d2b4f7e661538f261591c0c7de09))
- add refresh button to re-evaluate GraphOutput results ([9c37391](https://github.com/constructive-io/fbp/commit/9c37391e771828e8a860af3a3edb68ccc678c9cd))
- add subnet collapse feature (Shift+C to collapse selected nodes) ([d91f609](https://github.com/constructive-io/fbp/commit/d91f6092349f9cfa8507eb4dfab734311de1a4e7))
- add toolbar with hotkeys, node palette, drag-to-connect, and make home page show flow graph ([6548a2d](https://github.com/constructive-io/fbp/commit/6548a2dd92be5ec45eafdf5a42a7cbbb4e5165e4))
- improve evaluate button spinner animation ([f080856](https://github.com/constructive-io/fbp/commit/f08085685e82a2f5c1bef3263b9bfa78353ab1d0))
- improve marquee selection and add GraphQL syntax highlighting ([0d5757b](https://github.com/constructive-io/fbp/commit/0d5757baa347e490d2bad8cf592983e857e3da47))
