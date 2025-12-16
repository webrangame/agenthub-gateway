#!/bin/bash

# Script to find all EC2 instances across all regions

echo "🔍 Searching for EC2 instances across all AWS regions..."
echo "========================================================"
echo ""

# Get all available regions
REGIONS=$(aws ec2 describe-regions --query "Regions[*].RegionName" --output text)

FOUND_ANY=false

for region in $REGIONS; do
    echo "Checking region: $region"
    
    # Get all instances (running, stopped, etc.)
    INSTANCES=$(aws ec2 describe-instances \
        --region $region \
        --query "Reservations[*].Instances[*].{InstanceId:InstanceId,State:State.Name,PublicIP:PublicIpAddress,PrivateIP:PrivateIpAddress,Type:InstanceType,Name:Tags[?Key=='Name'].Value|[0]}" \
        --output json 2>/dev/null)
    
    if [ "$INSTANCES" != "[]" ] && [ -n "$INSTANCES" ]; then
        echo "$INSTANCES" | jq -r '.[] | .[] | "  ✅ Instance: \(.InstanceId // "N/A") | State: \(.State) | Public IP: \(.PublicIP // "N/A") | Type: \(.Type) | Name: \(.Name // "N/A")"' 2>/dev/null || echo "$INSTANCES"
        FOUND_ANY=true
    else
        echo "  No instances found"
    fi
    echo ""
done

if [ "$FOUND_ANY" = false ]; then
    echo "❌ No EC2 instances found in any region"
    echo ""
    echo "Current API is running on:"
    echo "  - ECS Fargate (not EC2)"
    echo "  - Cluster: fastgraph-cluster"
    echo "  - Region: us-east-1"
    echo "  - Current IP: 107.23.26.219:8081"
    echo ""
    echo "This is a Fargate task, not an EC2 instance."
fi

echo ""
echo "📊 Summary:"
echo "  Default Region: us-east-1"
echo "  ECS Cluster: fastgraph-cluster (us-east-1)"
echo "  Current API IP: 107.23.26.219:8081"
echo "  Service Type: ECS Fargate (serverless containers)"
