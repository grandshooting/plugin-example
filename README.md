
# plugin-example

This project provides a REST API designed to easily integrate an image processing plugin into your workflows in Grand Shooting.  
The main entry point is a POST HTTP endpoint, built to receive all the necessary information for processing and automated delivery of media files.

## Features

- POST endpoint to trigger image processing
- Supports customizable processing parameters
- Handles process tracking and automated delivery via a target URL

## API Entry Point

### POST `/plugin_example/submit_images`

**Description**  
This endpoint lets you submit a list of images to be processed by the plugin, along with all the information needed for tracking, customization, and delivery.

**Expected body parameters (JSON format)**

| Field         | Type     | Description                                                                         |
|---------------|----------|-------------------------------------------------------------------------------------|
| `account_id`  | string   | ID of the account requesting the processing                                         |
| `picture_ids` | array    | List of image IDs to be processed                                                   |
| `parameter`   | string   | Optional parameter to specify processing options (e.g., user selection)              |
| `process_id`  | string   | ID for tracking the processing request                                              |
| `transfer_id` | string   | Transfer ID, to be returned when delivering modified images                         |
| `target_url`  | string   | API URL where the processed media should be delivered                               |

**Sample POST request**
```json
{
  "account_id": 13985,
  "picture_ids": [134987, 19839865],
  "parameter": "grayscale",
  "process_id": "proc456",
  "transfer_id": 13875,
  "target_url": "https://example.com/api/receive"
}
```

## Installation

```bash
git clone https://github.com/grandshooting/plugin-example.git
cd plugin-example
npm install
```

## Running

```bash
npm start
```

## Contributing

Contributions are welcome! Feel free to open an issue or a pull request.

---

Let me know if you need further customization or more details!
