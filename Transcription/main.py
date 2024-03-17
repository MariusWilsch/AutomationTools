from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route("/aircall/webhook", methods=["POST"])
def handle_webhook():
    # Handle the webhook payload from Aircall
    data = request.json
    print(data)  # For demonstration, print the data to console

    # Process the data asynchronously here (e.g., queue a background job)
    #not implemented yet

    # Always return a 200 HTTP status code to Aircall
    return jsonify(success=True), 200


if __name__ == "__main__":
    app.run(port=5000)
