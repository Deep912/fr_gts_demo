import time
import random
from pynput.mouse import Controller, Button
from pynput import mouse

# Initialize the mouse controller
mouse_controller = Controller()

# Function to simulate human-like mouse movement
def human_like_movement(x, y, delay=0.5):
    # Get the current mouse position
    current_x, current_y = mouse_controller.position

    # Calculate the distance to the target position
    distance = ((x - current_x) ** 2 + (y - current_y) ** 2) ** 0.5

    # Simulate smooth movement with random delays
    steps = int(distance / 10)  # Adjust the step size for smoother movement
    for i in range(steps):
        # Calculate intermediate position
        intermediate_x = current_x + (x - current_x) * (i / steps)
        intermediate_y = current_y + (y - current_y) * (i / steps)

        # Move the mouse to the intermediate position
        mouse_controller.position = (intermediate_x, intermediate_y)

        # Add a small random delay to simulate human behavior
        time.sleep(random.uniform(0.01, 0.03))

    # Move to the final position
    mouse_controller.position = (x, y)

# Function to click the button with a delay
def click_button(x, y, delay=1.0):
    # Move the mouse to the coordinates with human-like behavior
    human_like_movement(x, y)

    # Wait for a random delay before clicking
    time.sleep(delay + random.uniform(-0.2, 0.2))  # Add some randomness to the delay

    # Simulate a mouse click
    mouse_controller.press(Button.left)
    time.sleep(random.uniform(0.1, 0.3))  # Random delay between press and release
    mouse_controller.release(Button.left)

# Example usage
if __name__ == "__main__":
    # Define the coordinates of the button
    target_x = 500  # Replace with your X coordinate
    target_y = 300  # Replace with your Y coordinate

    # Define the delay before clicking (in seconds)
    click_delay = 2.0  # Replace with your desired delay

    # Click the button
    click_button(target_x, target_y, click_delay)