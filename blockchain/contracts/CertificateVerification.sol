// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CertificateVerification {

    struct Certificate {
        string studentName;
        string course;
        string issuer;
        uint256 issueDate;
        bool isValid;
        string txHash;
    }

    mapping(string => Certificate) public certificates;

    function issueCertificate(
        string memory hash,
        string memory studentName,
        string memory course,
        string memory issuer,
        string memory txHash
    ) public {

        certificates[hash] = Certificate(
            studentName,
            course,
            issuer,
            block.timestamp,
            true,
            txHash
        );
    }

    function verifyCertificate(string memory hash)
        public
        view
        returns(bool)
    {
        return certificates[hash].isValid;
    }

    function revokeCertificate(string memory hash) public {
        certificates[hash].isValid = false;
    }

    function getCertificate(string memory hash)
        public
        view
        returns(
        string memory,
        string memory,
        string memory,
        uint256,
        bool
        )
        {
            Certificate memory cert = certificates[hash];

            require(bytes(cert.studentName).length > 0, "Certificate not found");

            return (
                cert.studentName,
                cert.course,
                cert.issuer,
                cert.issueDate,
                cert.isValid
            );
        }
}
