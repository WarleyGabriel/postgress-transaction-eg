#!/bin/bash

# Test concurrent withdrawals
echo "🏦 Testing 10 concurrent withdrawals..."
echo "=================================="

# Create a directory for results
mkdir -p test_results
timestamp=$(date +"%Y%m%d_%H%M%S")

# Function to make the API call
make_withdrawal() {
    local request_id=$1
    echo "🚀 Starting withdrawal request #$request_id"

    curl --location --request POST 'localhost:3000/api/accounts/3/withdraw' \
        --header 'Content-Type: application/json' \
        --data '{
        "amount": 300,
        "description": "Concurrent test #'$request_id'"
    }' \
        --silent \
        --write-out "%{http_code}" \
        --output "test_results/withdrawal_${request_id}_${timestamp}.json" \
        >"test_results/status_${request_id}_${timestamp}.txt" &

    # Store the process ID
    pids[$request_id]=$!
}

# Array to store process IDs
declare -a pids

# Start all requests simultaneously
for i in {1..10}; do
    make_withdrawal $i
done

echo "⏳ All requests started, waiting for completion..."

# Wait for all background processes to complete
for i in {1..10}; do
    wait ${pids[$i]}
    echo "✅ Request #$i completed"
done

echo ""
echo "🎯 All requests completed!"
echo "=================================="

# Show results summary
echo "📊 Results Summary:"
echo "-------------------"

success_count=0
error_count=0

for i in {1..10}; do
    status_file="test_results/status_${i}_${timestamp}.txt"
    result_file="test_results/withdrawal_${i}_${timestamp}.json"

    if [ -f "$status_file" ]; then
        # Read HTTP status code from status file
        http_status=$(cat "$status_file" 2>/dev/null)

        if [ "$http_status" = "200" ]; then
            echo "✅ Request #$i: SUCCESS (HTTP $http_status)"
            ((success_count++))
        else
            echo "❌ Request #$i: FAILED (HTTP $http_status)"
            # Try to extract error message from JSON response
            if [ -f "$result_file" ]; then
                error_msg=$(grep '"error"' "$result_file" 2>/dev/null | head -1 | sed 's/.*"error"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
                if [ -n "$error_msg" ]; then
                    echo "   Error: $error_msg"
                fi
            fi
            ((error_count++))
        fi
    else
        echo "❓ Request #$i: No status file found"
        ((error_count++))
    fi
done

echo ""
echo "📈 Final Stats:"
echo "   Successful (HTTP 200): $success_count"
echo "   Failed (Non-200): $error_count"
echo "   Total: 10"

echo "🔍 Detailed results saved in test_results/ directory"
echo "�� Test completed!"
