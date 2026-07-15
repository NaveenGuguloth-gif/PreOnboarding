import unittest

from backend.document_verification import (
    NEEDS_HR_REVIEW,
    PROVISIONALLY_VERIFIED,
    VERIFIED,
    build_verification_result,
    decide_status,
    name_match_score,
)


class DocumentVerificationTests(unittest.TestCase):
    def test_name_match_accepts_reordered_full_name(self):
        self.assertGreaterEqual(name_match_score("Naveen Kumar", "Kumar Naveen"), 0.9)

    def test_decision_is_provisional_without_trusted_provider(self):
        decision = decide_status(
            [
                {"check_type": "malware_scan", "status": VERIFIED, "reason": "ok"},
                {"check_type": "profile_name_match", "status": VERIFIED, "reason": "ok"},
                {"check_type": "trusted_source", "status": "VERIFICATION_UNAVAILABLE", "reason": "not configured"},
            ],
            80,
        )
        self.assertEqual(decision["status"], PROVISIONALLY_VERIFIED)

    def test_missing_required_fields_requires_hr_review(self):
        result = build_verification_result(
            {"file_path": __file__, "file_name": "degree_certificate.pdf"},
            {"name": "Naveen Kumar"},
            {"name": "Degree Certificate"},
        )
        self.assertEqual(result["decision"]["status"], NEEDS_HR_REVIEW)


if __name__ == "__main__":
    unittest.main()
