import time


class InferenceScheduler:

    def __init__(self, interval=2):
        self.interval = interval
        self.last_run = 0

    def should_run(self):
        now = time.time()

        if now - self.last_run >= self.interval:
            self.last_run = now
            return True

        return False
