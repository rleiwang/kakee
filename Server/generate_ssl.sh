# generate 2048 bits RSA private key
openssl genrsa -out private_key.pem 2048

#Private key to PKCS#8
openssl pkcs8 -topk8 -inform PEM -outform DER -in private_key.pem -out private_key.der -nocrypt

# public key in X.509 ASN.1 data format
openssl rsa -in private_key.pem -pubout -outform DER -out public_key.der

#Create a certificate signing request with the private key
openssl req -new -key private_key.pem -out rsaCertReq.csr

#Create a self-signed certificate with the private key and signing request
openssl x509 -req -days 3650 -in rsaCertReq.csr -signkey private_key.pem -out signed.crt

#Convert the certificate to DER format: the certificate contains the public key
#signed certificate for the iOS security library to be able to read the key data and
#of course the files have to be in the correct format
openssl x509 -outform der -in signed.crt -out signed_cert.der

#Export the private key and certificate to p12 file
#openssl pkcs12 -export -out rsaPrivate.p12 -inkey rsaPrivate.pem -in rsaCert.crt
