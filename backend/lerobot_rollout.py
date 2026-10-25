#!/usr/bin/env python

# Copyright 2025 The HuggingFace Inc. team. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# MODIFIED VERSION

import sys
import termios
import tty
import logging
import threading
from collections.abc import Callable
from typing import cast

from lerobot.cameras.opencv import OpenCVCameraConfig  # noqa: F401
from lerobot.cameras.realsense import RealSenseCameraConfig  # noqa: F401
from lerobot.cameras.zmq import ZMQCameraConfig  # noqa: F401
from lerobot.configs import parser
from lerobot.robots import (  # noqa: F401
    Robot,
    RobotConfig,
    bi_openarm_follower,
    bi_rebot_b601_follower,
    bi_so_follower,
    earthrover_mini_plus,
    hope_jr,
    koch_follower,
    lekiwi,
    omx_follower,
    openarm_follower,
    reachy2,
    rebot_b601_follower,
    so_follower,
    unitree_g1 as unitree_g1_robot,
)
from lerobot.rollout import (
    InteractiveSession,
    LinkedEvent,
    RolloutConfig,
    build_rollout_context,
    create_strategy,
)
from lerobot.teleoperators import (  # noqa: F401
    Teleoperator,
    TeleoperatorConfig,
    bi_openarm_leader,
    bi_openarm_mini,
    bi_rebot_102_leader,
    bi_so_leader,
    homunculus,
    koch_leader,
    omx_leader,
    openarm_leader,
    openarm_mini,
    reachy2_teleoperator,
    rebot_102_leader,
    so_leader,
    unitree_g1,
)
from lerobot.utils import init_logging, register_third_party_plugins
from lerobot.utils.process import ProcessSignalHandler
from lerobot.utils.visualization_utils import init_visualization, shutdown_visualization

logger = logging.getLogger(__name__)


@parser.wrap()
def rollout(cfg: RolloutConfig):
    """Main entry point for policy deployment."""
    init_logging(console_level=cfg.inference.log_level)

    if cfg.display_data:
        logger.info(
            "Initializing %s visualization (ip=%s, port=%s)",
            cfg.display_mode,
            cfg.display_ip,
            cfg.display_port,
        )
        init_visualization(cfg.display_mode, session_name="rollout", ip=cfg.display_ip, port=cfg.display_port)

    signal_handler = ProcessSignalHandler(use_threads=True, display_pid=False)
    shutdown_event = signal_handler.shutdown_event
    if not isinstance(shutdown_event, threading.Event):
        raise RuntimeError("ProcessSignalHandler(use_threads=True) must hand out a threading.Event")
    if cfg.interactive:
        # /reset and /stop end the control loop via the local flag; process signals still
        # propagate through the parent event.
        shutdown_event = LinkedEvent(shutdown_event)

    start_keyboard_listener(shutdown_event)

    logger.info("Building rollout context...")
    ctx = build_rollout_context(cfg, shutdown_event)

    strategy = create_strategy(cfg.strategy)
    logger.info("Rollout strategy: %s", cfg.strategy.type)
    logger.info(
        "Robot: %s | FPS: %.0f | Duration: %s",
        cfg.robot.type if cfg.robot else "?",
        cfg.fps,
        f"{cfg.duration}s" if cfg.duration > 0 else "infinite",
    )

    session: InteractiveSession | None = None
    try:
        strategy.setup(ctx)
        if cfg.interactive:
            logger.info("Rollout setup complete — starting interactive session (robot idle until /start)")
            session = InteractiveSession(strategy, ctx)
            session.run()
        else:
            logger.info("Rollout setup complete, starting rollout...")
            strategy.run(ctx)
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    finally:
        strategy.teardown(ctx)
        if cfg.display_data:
            shutdown_visualization(cfg.display_mode)

    failure = session.controller if session is not None else ctx.policy.inference
    if failure.failed:
        logger.error("Rollout ended by a terminal fault: %s", failure.failure_traceback)
        raise SystemExit(1)
    logger.info("Rollout finished")

def start_keyboard_listener(shutdown_event: threading.Event):
    def listen():
        try:
            if not sys.stdin.isatty():
                return

            fd = sys.stdin.fileno()
            old_settings = termios.tcgetattr(fd)
            tty.setcbreak(fd)
            print("\n>>> [CONTROL] Press 'q' or 'space' on terminal to stop the robot before timeout <<<\n")

            while not shutdown_event.is_set():
                ch = sys.stdin.read(1)
                if ch in ['q', 'Q', ' ', '\x1b']:
                    print("\n[CONTROL] Key detected! Stopping LeRobot...")
                    shutdown_event.set()
                    break
        except Exception:
            pass
        finally:
            try:
                termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
            except Exception:
                pass

    t = threading.Thread(target=listen, daemon=True)
    t.start()

def main() -> None:
    """CLI entry point for ``lerobot-rollout``."""
    register_third_party_plugins()
    cast(Callable[[], None], rollout)()


if __name__ == "__main__":
    main()
