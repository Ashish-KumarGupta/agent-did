from agent_did import Identity, sign_request, verify_request

def main():
    # 1. Create identity (in-memory)
    identity = Identity.create()

    # 2. Create dummy HTTP request
    request = {
        "method": "GET",
        "url": "https://example.com",
        "headers": {},
        "body": ""
    }

    # 3. Sign request
    signed_request = sign_request(identity, request)

    # 4. Verify request
    is_valid = verify_request(signed_request)

    # 5. Output result
    print({
        "success": is_valid
    })

if __name__ == "__main__":
    main()
